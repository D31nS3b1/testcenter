<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);
// TODO add unit-tests

class AccessSet extends DataCollectionTypeSafe {

  static $accessObjectTypes = [
    'test',
    'superAdmin',
    'workspaceAdmin',
    'testGroupMonitor',
    'attachmentManager'
  ];

  protected string $token;
  protected string $displayName;
  protected object $customTexts;
  protected array $flags;
  protected object $claims;

  static function createFromPersonSession(PersonSession $loginWithPerson, TestData | Group ...$accessItems): AccessSet {
    $login = $loginWithPerson->getLoginSession()->getLogin();

    $displayName = self::getDisplayName(
      $login->getGroupLabel(),
      $login->getName(),
      $loginWithPerson->getPerson()->getNameSuffix()
    );

    $accessSet = new AccessSet(
      $loginWithPerson->getPerson()->getToken(),
      $displayName,
      [],
      $login->getCustomTexts() ?? new stdClass()
    );

    foreach ($accessItems as $accessItem) {
      switch (get_class($accessItem)) {
        case 'Group':
          $accessSet->addGroupMonitors($accessItem);
          break;
        case 'TestData':
          $accessSet->addTests($accessItem);
          break;
      }
    }

    if (($login->getMode() == 'monitor-group') and str_starts_with($login->getGroupName(), 'experimental')) {
      $accessSet->addAccessObjects(
        'attachmentManager',
        new AccessObject($login->getGroupName(), 'attachmentManager', $login->getGroupLabel())
      );
    }

    return $accessSet;
  }

  static function createFromAdminToken(Admin $admin, WorkspaceData ...$workspaces): AccessSet {
    $accessSet = new AccessSet(
      $admin->getToken(),
      $admin->getName()
    );

    $accessObjects = array_map(
      function(WorkspaceData $workspace): AccessObject {
        return new AccessObject(
          (string) $workspace->getId(),
          'workspaceAdmin',
          $workspace->getName(),
          ["mode" => $workspace->getMode()]
        );
      },
      $workspaces
    );

    $accessSet->addAccessObjects('workspaceAdmin', ...$accessObjects);

    if ($admin->isSuperadmin()) {
      $accessSet->addAccessObjects('superAdmin');
    }

    return $accessSet;
  }

  static function createFromLoginSession(LoginSession $loginSession): AccessSet {
    return new AccessSet(
      $loginSession->getToken(),
      "{$loginSession->getLogin()->getGroupLabel()}/{$loginSession->getLogin()->getName()}",
      $loginSession->getLogin()->isCodeRequired() ? ['codeRequired'] : [],
      $loginSession->getLogin()->getCustomTexts()
    );
  }

  public function __construct(
    string   $token,
    string   $displayName,
    array    $flags = [],
    stdClass $customTexts = null
  ) {
    $this->token = $token;
    $this->displayName = $displayName;
    $this->flags = array_map(function($flag) {
      return (string) $flag;
    }, $flags);

    $this->claims = (object) [];

    $this->customTexts = $customTexts ?? (object) [];
  }

  function jsonSerialize(): mixed {
    $json = parent::jsonSerialize();
    $deprecatedFormat = (object) [];
    foreach ($this->claims as $accessType => $accessObjectList) {
      $deprecatedFormat->$accessType = [];

      foreach ($accessObjectList as $accessObject) {
        /* @var $accessObject AccessObject */
        $deprecatedFormat->$accessType[] = $accessObject->getId();
      }
    }
    $json['access'] = $deprecatedFormat;
    return $json;
  }

  static function getDisplayName(string $groupLabel, string $loginName, ?string $nameSuffix): string {
    $displayName = "$groupLabel/$loginName";
    $displayName .= $nameSuffix ? '/' . $nameSuffix : '';
    return $displayName;
  }

  public function hasAccessType(string $type): bool {
    return isset($this->claims->$type);
  }

  private function addAccessObjects(string $type, AccessObject ...$accessObjects): void {
    if (!in_array($type, $this::$accessObjectTypes)) {
      throw new Exception("AccessObject type `$type` is not valid.");
    }

    if (!isset($this->claims->$type)) {
      $this->claims->$type = [];
    }

    array_push($this->claims->$type, ...$accessObjects);
  }

  private function addTests(TestData ...$testsOfPerson): void {
    $bookletsData = array_map(
      function(TestData $testData): AccessObject {
        return new AccessObject(
          $testData->getBookletId(),
          'test',
          $testData->getLabel(),
          [
            'locked' => $testData->isLocked(),
            'running' => $testData->isRunning()
          ]
        );
      },
      $testsOfPerson
    );
    $this->addAccessObjects('test', ...$bookletsData);
  }

  private function addGroupMonitors(Group ...$groups): void {
    $groupMonitors = array_map(
      function(Group $group) { return new AccessObject($group->getName(), 'testGroupMonitor', $group->getLabel()); },
      $groups
    );
    $this->addAccessObjects('testGroupMonitor', ...$groupMonitors);
  }
}
