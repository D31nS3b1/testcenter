<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);

// TODO unit tests !

use Slim\Exception\HttpException;
use Slim\Exception\HttpForbiddenException;
use Slim\Exception\HttpNotFoundException;
use Slim\Exception\HttpUnauthorizedException;
use Slim\Http\ServerRequest as Request;
use Slim\Http\Response;
use Slim\Psr7\Stream;

class TestController extends Controller {
  public static function put(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');
    $body = RequestBodyParser::getElements($request, [
      'bookletName' => null
    ]);

    $test = self::testDAO()->getTestByPerson($authToken->getId(), $body['bookletName']);

    if (!$test) {
      $workspace = new Workspace($authToken->getWorkspaceId());
      $bookletLabel = $workspace->getFileById('Booklet', $body['bookletName'])->getLabel();
      $test = self::testDAO()->createTest($authToken->getId(), $body['bookletName'], $bookletLabel);
    }

    if ($test->locked) {
      throw new HttpException($request, "Test #$test->id `$test->label` is locked.", 423);
    }

    $response->getBody()->write((string) $test->id);
    return $response->withStatus(201);
  }

  public static function get(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');     // auth 1
    $testId = (int) $request->getAttribute('test_id');

    $test = self::testDAO()->getTestById($testId);

    if (!$test) {
      throw new HttpNotFoundException($request, "Test #$testId not found");
    }

    if ($test->locked) {
      throw new HttpException($request, "Test #$testId `$test->label` is locked.", 423);
    }

    $workspace = new Workspace($authToken->getWorkspaceId());
    $bookletFile = $workspace->getFileById('Booklet', $test->bookletId); // 3

    // TODO check for Mode::hasCapability('monitorable'))

    if (!$test->running) {
      $personSession = self::sessionDAO()->getPersonSessionByToken($authToken->getToken());
      $message = SessionChangeMessage::session($test->id, $personSession);
      $message->setTestState((array) $test->state, $test->bookletId);
      self::testDAO()->setTestRunning($test->id);
    } else {
      $message = SessionChangeMessage::testState(
        $authToken->getGroup(),
        $authToken->getId(),
        $test->id,
        (array) $test->state,
        $test->bookletId
      );
    }
    BroadcastService::sessionChange($message);

    return $response->withJson([
      'mode' => $authToken->getMode(),
      'laststate' => (array) $test->state,
      'xml' => $bookletFile->getContent(),
      'resources' => $workspace->getBookletResources($bookletFile->getName()), // 6
      'firstStart' => !$test->running
    ]);
  }

  public static function getUnit(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');
    $unitName = $request->getAttribute('unit_name');
    $unitAlias = $request->getAttribute('alias');
    $testId = (int) $request->getAttribute('test_id');

    $workspace = new Workspace($authToken->getWorkspaceId());
    /* @var $unitFile XMLFileUnit */
    $unitFile = $workspace->getFileById('Unit', $unitName);

    if (!$unitAlias) {
      $unitAlias = $unitName;
    }

    // TODO check if unit is (still) valid

    // TODO each part could have a different type
    $unitData = self::testDAO()->getDataParts($testId, $unitAlias);

    $res = [
      'state' => (object) self::testDAO()->getUnitState($testId, $unitAlias),
      'dataParts' => (object) $unitData['dataParts'],
      'unitStateDataType' => $unitData['dataType'],
      'dependencies' => []
    ];

    $unitRelations = $workspace->getFileRelations($unitFile);

    foreach ($unitRelations as $unitRelation) {
      /* @var FileRelation $unitRelation */

      switch ($unitRelation->getRelationshipType()) {
        case FileRelationshipType::isDefinedBy:
          $res['definitionRef'] = $unitRelation->getTargetName();
          break;

        case FileRelationshipType::usesPlayer:
          $res['dependencies'][] = [
            'name' => $unitRelation->getTargetName(),
            'type' => 'player'
          ];
          $res['playerId'] = $unitRelation->getTargetId();
          break;

        case FileRelationshipType::usesPlayerResource:
          $res['dependencies'][] = [
            'name' => $unitRelation->getTargetName(),
            'type' => 'package' // TODO naming is very bad. can be a single file as well. should be: 'player-dependency'
          ];
          break;
      }
    }

    if (!isset($res['definitionRef'])) {
      $res['definition'] = $unitFile->getDefinition();
    }

    return $response->withJson($res);
  }

  public static function getResource(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');

    if (!$authToken) {
      $tokenString = $request->getAttribute('auth_token');
      $authToken = self::sessionDAO()->getToken($tokenString, ['person']);
    }

    $resourceName = $request->getAttribute('resource_name');
    $allowSimilarVersion = $request->getQueryParam('v', 'f') != 'f';

    $workspace = new Workspace($authToken->getWorkspaceId());

    $fileId = $allowSimilarVersion ? FileID::normalize($resourceName) : strtoupper($resourceName);

    $resourceFile = $workspace->getFileById('Resource', $fileId);

    return $response
      ->withBody(new Stream(fopen($resourceFile->getPath(), 'rb')))
      ->withHeader('Content-type', 'application/octet-stream') // use octet-stream to make progress trackable
      ->withHeader('Content-length', $resourceFile->getSize());
  }

  public static function getResourceFromPackage(Request $request, Response $response, $args): Response {
    $tokenStringFromUrl = $request->getAttribute('auth_token');
    $packageName = $request->getAttribute('package_name');
    $resourceName = $args['path'];

    $authToken = self::sessionDAO()->getToken($tokenStringFromUrl, ['person']);
    $workspace = new Workspace($authToken->getWorkspaceId());
    $resourceFile = $workspace->getPackageFilePath($packageName, $resourceName);

    return $response
      ->withBody(new Stream(fopen($resourceFile, 'rb')))
      ->withHeader('Content-type', FileExt::getMimeType($resourceFile))
      ->withHeader('Content-length', filesize($resourceFile));
  }

  public static function getResourceFromPath(Request $request, Response $response, $args): Response {
    $tokenStrFromHeader = $request->getHeaderLine('AuthToken');
    $resourceName = $args['path'];
    $workspaceId = (int) $request->getAttribute('ws_id');

    if (!$tokenStrFromHeader) {
      throw new HttpUnauthorizedException($request, 'No Token given');
    }
    if (!self::sessionDAO()->groupTokenExists($workspaceId, $tokenStrFromHeader)) {
      throw new HttpForbiddenException($request, 'Group-Token not valid');
    }

    $workspace = new Workspace($workspaceId);
    $resourceFile = $workspace->getWorkspacePath() . '/' . $resourceName;

    return $response
      ->withBody(new Stream(fopen($resourceFile, 'rb')))
      ->withHeader('Content-type', FileExt::getMimeType($resourceFile))
      ->withHeader('Content-length', filesize($resourceFile));
  }


  public static function putUnitReview(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');
    $unitName = $request->getAttribute('unit_name');

    $review = RequestBodyParser::getElements($request, [
      'priority' => 0, // was: p
      'categories' => 0, // was: c
      'entry' => null // was: e
    ]);

    // TODO check if unit exists in this booklet https://github.com/iqb-berlin/testcenter-iqb-php/issues/106

    $priority = (is_numeric($review['priority']) and ($review['priority'] < 4) and ($review['priority'] >= 0))
      ? (int) $review['priority']
      : 0;

    self::testDAO()->addUnitReview($testId, $unitName, $priority, $review['categories'], $review['entry']);

    return $response->withStatus(201);
  }

  public static function putReview(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');

    $review = RequestBodyParser::getElements($request, [
      'priority' => 0, // was: p
      'categories' => 0, // was: c
      'entry' => null // was: e
    ]);

    $priority = (is_numeric($review['priority']) and ($review['priority'] < 4) and ($review['priority'] >= 0))
      ? (int) $review['priority']
      : 0;

    self::testDAO()->addTestReview($testId, $priority, $review['categories'], $review['entry']);

    return $response->withStatus(201);
  }

  public static function putUnitResponse(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');
    $unitName = $request->getAttribute('unit_name');

    $unitResponse = RequestBodyParser::getElements($request, [
      'timeStamp' => null,
      'dataParts' => [],
      'responseType' => 'unknown'
    ]);

    // TODO check if unit exists in this booklet https://github.com/iqb-berlin/testcenter-iqb-php/issues/106

    self::testDAO()->updateDataParts(
      $testId,
      $unitName,
      (array) $unitResponse['dataParts'],
      $unitResponse['responseType'],
      $unitResponse['timeStamp']
    );

    return $response->withStatus(201);
  }

  public static function patchState(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');

    $testId = (int) $request->getAttribute('test_id');

    $stateData = RequestBodyParser::getElementsArray($request, [
      'key' => null,
      'content' => null,
      'timeStamp' => null
    ]);

    $statePatch = TestController::stateArray2KeyValue($stateData);

    $newState = self::testDAO()->updateTestState($testId, $statePatch);

    foreach ($stateData as $entry) {
      self::testDAO()->addTestLog($testId, $entry['key'], $entry['timeStamp'], json_encode($entry['content']));
    }

    BroadcastService::sessionChange(
      SessionChangeMessage::testState($authToken->getGroup(), $authToken->getId(), $testId, $newState)
    );

    return $response->withStatus(200);
  }

  public static function putLog(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');

    $logData = RequestBodyParser::getElementsArray($request, [
      'key' => null,
      'content' => '',
      'timeStamp' => null
    ]);

    foreach ($logData as $entry) {
      self::testDAO()->addTestLog($testId, $entry['key'], $entry['timeStamp'], json_encode($entry['content']));
    }

    return $response->withStatus(201);
  }

  public static function putUnitState(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');

    $testId = (int) $request->getAttribute('test_id');
    $unitName = $request->getAttribute('unit_name');

    // TODO check if unit exists in this booklet https://github.com/iqb-berlin/testcenter-iqb-php/issues/106

    $stateData = RequestBodyParser::getElementsArray($request, [
      'key' => null,
      'content' => null,
      'timeStamp' => null
    ]);

    $statePatch = TestController::stateArray2KeyValue($stateData);

    $newState = self::testDAO()->updateUnitState($testId, $unitName, $statePatch);

    foreach ($stateData as $entry) {
      self::testDAO()->addUnitLog($testId, $unitName, $entry['key'], $entry['timeStamp'], $entry['content']);
    }

    BroadcastService::sessionChange(SessionChangeMessage::unitState(
      $authToken->getGroup(),
      $authToken->getId(),
      $testId,
      $unitName,
      $newState
    ));

    return $response->withStatus(200);
  }

  public static function putUnitLog(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');
    $unitName = $request->getAttribute('unit_name');

    // TODO check if unit exists in this booklet https://github.com/iqb-berlin/testcenter-iqb-php/issues/106

    $logData = RequestBodyParser::getElementsArray($request, [
      'key' => null,
      'content' => '',
      'timeStamp' => null
    ]);

    foreach ($logData as $entry) {
      self::testDAO()->addUnitLog($testId, $unitName, $entry['key'], $entry['timeStamp'], json_encode($entry['content']));
    }

    return $response->withStatus(201);
  }

  public static function patchLock(Request $request, Response $response): Response {
    /* @var $authToken AuthToken */
    $authToken = $request->getAttribute('AuthToken');

    $testId = (int) $request->getAttribute('test_id');

    $lockEvent = RequestBodyParser::getElements($request, [
      'timeStamp' => null,
      'message' => ''
    ]);

    self::testDAO()->lockTest($testId);
    self::testDAO()->addTestLog($testId, $lockEvent['message'], $lockEvent['timeStamp']);

    BroadcastService::sessionChange(
      SessionChangeMessage::testState($authToken->getGroup(), $authToken->getId(), $testId, ['status' => 'locked'])
    );

    return $response->withStatus(200);
  }

  public static function getCommands(Request $request, Response $response): Response {
    // TODO do we have to check access to test?
    $testId = (int) $request->getAttribute('test_id');
    $lastCommandId = RequestBodyParser::getElementWithDefault($request, 'lastCommandId', null);

    $commands = self::testDAO()->getCommands($testId, $lastCommandId);

    $testee = [
      'testId' => $testId,
      'disconnectNotificationUri' => Server::getUrl() . "/test/$testId/connection-lost"
    ];
    $bsUrl = BroadcastService::registerChannel('testee', $testee);

    if ($bsUrl !== null) {
      $response = $response->withHeader('SubscribeURI', $bsUrl);
    }

    $testSession = self::testDAO()->getTestSession($testId);
    if (isset($testSession['laststate']['CONNECTION']) && ($testSession['laststate']['CONNECTION'] == 'LOST')) {
      self::updateTestState($testId, $testSession, 'CONNECTION', 'POLLING');
    }

    return $response->withJson($commands);
  }

  private static function updateTestState(int $testId, array $testSession, string $field, string $value): void {
    $newState = self::testDAO()->updateTestState($testId, [$field => $value]);
    self::testDAO()->addTestLog($testId, '"' . $field . '"', 0, $value);

    $sessionChangeMessage = SessionChangeMessage::testState(
      $testSession['group_name'],
      (int) $testSession['person_id'],
      $testId,
      $newState
    );
    BroadcastService::sessionChange($sessionChangeMessage);
  }

  public static function patchCommandExecuted(Request $request, Response $response): Response {
    // TODO to we have to check access to test?
    $testId = (int) $request->getAttribute('test_id');
    $commandId = (int) $request->getAttribute('command_id');

    $changed = self::testDAO()->setCommandExecuted($testId, $commandId);

    return $response->withStatus(200, $changed ? 'OK' : 'OK, was already marked as executed');
  }

  public static function postConnectionLost(Request $request, Response $response): Response {
    $testId = (int) $request->getAttribute('test_id');

    $testSession = self::testDAO()->getTestSession($testId);

    if (isset($testSession['laststate']['CONNECTION']) && ($testSession['laststate']['CONNECTION'] == 'LOST')) {
      return $response->withStatus(200, "connection already set as lost");
    }

    self::updateTestState($testId, $testSession, 'CONNECTION', 'LOST');

    return $response->withStatus(200);
  }

  // TODO replace this and use proper data-class
  private static function stateArray2KeyValue(array $stateData): array {
    $statePatch = [];
    foreach ($stateData as $stateEntry) {
      $statePatch[$stateEntry['key']] = is_object($stateEntry['content'])
        ? json_encode($stateEntry['content'])
        : $stateEntry['content'];
    }
    return $statePatch;
  }
}
