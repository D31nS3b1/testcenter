<?php /** @noinspection PhpUnhandledExceptionInspection */

declare(strict_types=1);

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Slim\Exception\HttpUnauthorizedException;

require_once "src/data-collection/DataCollectionTypeSafe.class.php";
require_once "src/data-collection/AccessObject.class.php";
require_once "src/data-collection/TestData.class.php";
require_once "src/data-collection/WorkspaceData.class.php";
require_once "src/controller/Controller.class.php";
require_once "src/controller/SessionController.class.php";

class SessionControllerInjector extends SessionController {
  public static function injectSessionDAO(SessionDAO $sessionDao) {
    SessionController::$_sessionDAO = $sessionDao;
  }

  public static function injectTestDAO(TestDAO $testDAO) {
    SessionController::$_testDAO = $testDAO;
  }

  public static function injectAdminDAO(AdminDAO $adminDAO) {
    SessionController::$_adminDAO = $adminDAO;
  }

  public static function injectWorkspace(Workspace $bookletsFolder, int $workspaceId) {
    self::$_workspaces[$workspaceId] = $bookletsFolder;
  }
}

/**
 * @runTestsInSeparateProcesses
 * @preserveGlobalState disabled
 */
final class SessionControllerTest extends TestCase {
  function setUp(): void {
    require_once "test/unit/test-helper/RequestCreator.class.php";
    require_once "test/unit/test-helper/ResponseCreator.class.php";
    require_once "src/data-collection/DataCollectionTypeSafe.class.php";
    require_once "src/data-collection/FileData.class.php";
    require_once "src/data-collection/Login.class.php";
    require_once "src/data-collection/LoginSession.class.php";
    require_once "src/data-collection/AccessSet.class.php";
    require_once "src/data-collection/PersonSession.class.php";
    require_once "src/data-collection/Person.class.php";
    require_once "src/data-collection/SessionChangeMessage.class.php";
    require_once "src/data-collection/AuthToken.class.php";
    require_once "src/data-collection/Admin.class.php";
    require_once "src/controller/Controller.class.php";
    require_once "src/controller/SessionController.class.php";
    require_once "src/files/File.class.php";
    require_once "src/files/XMLFile.class.php";
    require_once "src/files/XMLFileBooklet.class.php";
    require_once "src/helper/RequestBodyParser.class.php";
    require_once "src/helper/JSON.class.php";
    require_once "src/helper/Password.class.php";
    require_once "src/helper/Mode.class.php";
    require_once "src/helper/TimeStamp.class.php";
    require_once "src/helper/BroadcastService.class.php";
    require_once "src/dao/DAO.class.php";
    require_once "src/dao/SessionDAO.class.php";
    require_once "src/dao/TestDAO.class.php";
    require_once "src/dao/AdminDAO.class.php";
    require_once "src/workspace/Workspace.class.php";

    $mockBooklet = $this->createMock('XMLFileBooklet');
    $mockBooklet
      ->method('getLabel')
      ->willReturn('A BOOKLET LABEL READ FROM FILE');
    $mockWorkspace = $this->createMock('Workspace');
    $mockWorkspace
      ->method('getFileById')
      ->willReturn($mockBooklet);

    SessionControllerInjector::injectWorkspace($mockWorkspace, 1);
  }

  private function mockSessionDAO(array $functionsAndResults, array $expectFunctionCalls = []): void {
    $daoStub = $this->createMock('SessionDAO');
    $this->addMockFunctions($daoStub, $functionsAndResults, $expectFunctionCalls);
    SessionControllerInjector::injectSessionDAO($daoStub);
  }

  private function mockTestDAO(array $functionsAndResults, array $expectFunctionCalls = []): void {
    $daoStub = $this->createMock('TestDAO');
    $this->addMockFunctions($daoStub, $functionsAndResults, $expectFunctionCalls);
    SessionControllerInjector::injectTestDAO($daoStub);
  }

  private function mockAdminDAO(array $functionsAndResults, array $expectFunctionCalls = []): void {
    $daoStub = $this->createMock('AdminDAO');
    $this->addMockFunctions($daoStub, $functionsAndResults, $expectFunctionCalls);
    SessionControllerInjector::injectAdminDAO($daoStub);
  }

  private function addMockFunctions(MockObject $mockObject, array $functionsAndResults, array $expectFunctionCalls = []) {
    foreach ($functionsAndResults as $function => $result) {
      $method = $mockObject
        ->expects(isset($expectFunctionCalls[$function]) ? $this->exactly($expectFunctionCalls[$function]) : $this->any())
        ->method($function);

      if ($result instanceof Exception) {
        $method->willThrowException($result);

      } else if (is_callable($result)) {
        $method->willReturnCallback($result);

      } else {
        $method->willReturn($result);
      }
    }
  }

  public function test_putSessionLogin_loginThatRequiresCode(): void { //!

    $this->mockSessionDAO([
      'getOrCreateLoginSession' => new LoginSession(
        1,
        'some_token',
        new Login(
          'sample_user',
          'password_hash',
          'run-hot-return',
          'sample_group',
          'Sample Group',
          ['aaa' => ['THE_BOOKLET']],
          1
        )
      ),
      'renewPersonToken' => function(PersonSession $personSession): PersonSession {
        return $personSession->withNewToken('new_token');
      }
    ]);

    $response = SessionController::putSessionLogin(
      RequestCreator::create('PUT', '/session/login', '{"name":"test", "password":"user123"}'),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"some_token","displayName":"Sample Group\/sample_user","customTexts":{},"flags":["codeRequired"],"claims":{},"access":{}}',
      $response->getBody()->getContents()
    );
    $this->assertEquals(200, $response->getStatusCode());
  }

  public function test_putSessionLogin_throwExceptionIfErrorWasThrown(): void {
    // happens when login is expired

    $this->mockSessionDAO([
      'getOrCreateLoginSession' => new Exception("some message")
    ]);

    $this->expectException(Exception::class);

    SessionController::putSessionLogin(
      RequestCreator::create('PUT', '/session/login', '{"name":"test", "password":"foo"}'),
      ResponseCreator::createEmpty()
    );
  }

  public function test_putSessionLogin_throwExceptionNoLOginFound(): void {
    // happens im login is expired for example

    $this->mockSessionDAO([
      'getOrCreateLoginSession' => null
    ]);

    $this->expectException(Exception::class);

    SessionController::putSessionLogin(
      RequestCreator::create('PUT', '/session/login', '{"name":"test", "password":"foo"}'),
      ResponseCreator::createEmpty()
    );
  }

  public function test_putSessionLogin_returnPersonSessionIfNoCodeRequired(): void {
    $loginSession = new LoginSession(
      1,
      'some_token',
      new Login(
        'sample_user',
        'password_hash',
        'run-hot-return',
        'sample_group',
        'Sample Group',
        ['' => ['THE_BOOKLET']],
        1
      )
    );

    $this->mockSessionDAO([
      'getOrCreateLoginSession' => $loginSession,
      'getOrCreatePersonSession' => new PersonSession(
        $loginSession,
        new Person(1, 'person_token', '', '')
      ),
      'renewPersonToken' => function(PersonSession $personSession): PersonSession {
        return $personSession->withNewToken('new_token');
      },
      'getTestsOfPerson' => [
        new TestData('THE_BOOKLET', 'Label of THE_BOOKLET', 'Description', true, false)
      ]
    ]);

    $response = SessionController::putSessionLogin(
      RequestCreator::create('PUT', '/session/login', '{"name":"sample_user", "password":"foo"}'),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"new_token","displayName":"Sample Group\/sample_user","customTexts":{},"flags":[],"claims":{"test":[{"label":"Label of THE_BOOKLET","id":"THE_BOOKLET","type":"test","flags":{"locked":true,"running":false}}]},"access":{"test":["THE_BOOKLET"]}}',
      $response->getBody()->getContents()
    );
    $this->assertEquals(200, $response->getStatusCode());
  }

  public function test_putSessionLogin_registerGroupIfMonitor(): void {
    $loginSessionMonitor = new LoginSession(
      1,
      'some_token',
      new Login(
        'test-monitor',
        'password_hash',
        'monitor-group',
        'sample_group',
        'Sample Group',
        ['' => ['THE_BOOKLET']],
        1
      )
    );

    $loginTesteeA = new Login(
      'test',
      'password_hash',
      'run-hot-return',
      'sample_group',
      'Sample Group',
      ['aaa' => ['THE_BOOKLET'], 'yyy' => ['THE_BOOKLET'], 'zzz' => ['THE_BOOKLET'], 'xxx' => ['THE_BOOKLET']],
      1
    );

    $loginTesteeB = new Login(
      'testeeB',
      'password_hash',
      'run-hot-return',
      'sample_group',
      'Sample Group',
      ['' => ['THE_BOOKLET', 'THE_OTHER_BOOKLET']],
      1
    );

    $this->mockSessionDAO(
      [
        'getOrCreateLoginSession' => $loginSessionMonitor,
        'createLoginSession' => function(Login $login): LoginSession {
          return new LoginSession(
            -1,
            '',
            $login
          );
        },
        'getOrCreatePersonSession' => function(LoginSession $loginSession, string $code): PersonSession {
          return new PersonSession(
            $loginSession,
            new Person(-1, 'person_token', $code, $code)
          );
        },
        'getLoginsByGroup' => [
          new LoginSession(2, '', $loginTesteeA),
          new LoginSession(3, '', $loginTesteeB)
        ],
        'renewPersonToken' => function(PersonSession $personSession): PersonSession {
          return $personSession->withNewToken('new_token');
        },
        'getTestsOfPerson' => function(PersonSession $personSession): array {
          return array_map(
            function(string $bookletId): TestData {
              return new TestData($bookletId, "label of $bookletId", "desc", false, true);
            },
            $personSession->getLoginSession()->getLogin()->getBooklets()[$personSession->getPerson()->getCode() ?? '']
          );
        }
      ],
      [
        'getOrCreateLoginSession' => 1,
        'getOrCreatePersonSession' => 6, // 4 persons of loginTesteeA + 1 person of loginTesteeB + 1 monitor
        'getLoginsByGroup' => 1, // 1
      ]
    );

    $this->mockTestDAO(
      [
        'getOrCreateTest' => ['id' => -1],
      ],
      [
        'getOrCreateTest' => 6 // 4 of loginTesteeA + 2 of loginTesteeB
      ]
    );

    $response = SessionController::putSessionLogin(
      RequestCreator::create('PUT', '/session/login', '{"name":"test", "password":"foo"}'),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"new_token","displayName":"Sample Group\/test-monitor","customTexts":{},"flags":[],"claims":{"test":[{"label":"label of THE_BOOKLET","id":"THE_BOOKLET","type":"test","flags":{"locked":false,"running":true}}],"testGroupMonitor":[{"label":"Sample Group","id":"sample_group","type":"testGroupMonitor","flags":[]}]},"access":{"test":["THE_BOOKLET"],"testGroupMonitor":["sample_group"]}}',
      $response->getBody()->getContents()
    );
    $this->assertEquals(200, $response->getStatusCode());
  }

  public function test_getSession_loginSession() {
    $loginSession = new LoginSession(
      1,
      'login_token',
      new Login(
        'sample_user',
        'password_hash',
        'run-hot-return',
        'sample_group',
        'Sample Group',
        ['xxx' => ['THE_BOOKLET']],
        1
      ));

    $loginToken = new AuthToken('login_token', 1, 'login', 1, 'run-hot-return', 'sample_group');

    $this->mockSessionDAO([
      'getLoginSessionByToken' => $loginSession
    ]);

    $response = SessionController::getSession(
      RequestCreator::create('GET', '/session')->withAttribute('AuthToken', $loginToken),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"login_token","displayName":"Sample Group\/sample_user","customTexts":{},"flags":["codeRequired"],"claims":{},"access":{}}',
      $response->getBody()->getContents()
    );

  }

  public function test_getSession_personSession() {
    $personSession = new PersonSession(
      new LoginSession(
        1,
        'login_token',
        new Login(
          'sample_user',
          'password_hash',
          'run-hot-return',
          'sample_group',
          'Sample Group',
          ['xxx' => ['THE_BOOKLET']],
          1
        )
      ),
      new Person(
        1,
        'person_token',
        'xxx',
        'xxx'
      )
    );

    $personToken = new AuthToken('person_token', 1, 'person', 1, 'run-hot-return', 'sample_group');

    $this->mockSessionDAO([
      'getPersonSessionByToken' => $personSession,
      'getTestsOfPerson' => [
        new TestData('THE_BOOKLET', 'Label of THE_BOOKLET', 'Description', true, false)
      ]
    ]);

    $response = SessionController::getSession(
      RequestCreator::create('GET', '/session')->withAttribute('AuthToken', $personToken),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"person_token","displayName":"Sample Group\/sample_user\/xxx","customTexts":{},"flags":[],"claims":{"test":[{"label":"Label of THE_BOOKLET","id":"THE_BOOKLET","type":"test","flags":{"locked":true,"running":false}}]},"access":{"test":["THE_BOOKLET"]}}',
      $response->getBody()->getContents()
    );
  }

  public function test_getSession_monitor() {
    $personSession = new PersonSession(
      new LoginSession(
        2,
        'login_token',
        new Login(
          'sample_monitor',
          'password_hash',
          'monitor-group',
          'sample_group',
          'Sample Group',
          ['' => ['THE_BOOKLET']],
          1
        )
      ),
      new Person(
        2,
        'monitor_token',
        '',
        ''
      )
    );

    $personToken = new AuthToken('monitor_token', 2, 'person', 1, 'monitor-group', 'sample_group');

    $this->mockSessionDAO([
      'getPersonSessionByToken' => $personSession,
      'getTestsOfPerson' => [
        new TestData('THE_BOOKLET', 'Label of THE_BOOKLET', 'Description', true, false)
      ]
    ]);

    $response = SessionController::getSession(
      RequestCreator::create('GET', '/session')->withAttribute('AuthToken', $personToken),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"monitor_token","displayName":"Sample Group\/sample_monitor","customTexts":{},"flags":[],"claims":{"test":[{"label":"Label of THE_BOOKLET","id":"THE_BOOKLET","type":"test","flags":{"locked":true,"running":false}}],"testGroupMonitor":[{"label":"Sample Group","id":"sample_group","type":"testGroupMonitor","flags":[]}]},"access":{"test":["THE_BOOKLET"],"testGroupMonitor":["sample_group"]}}',
      $response->getBody()->getContents()
    );
  }

  public function test_getSession_adminSession() {
    $adminToken = new AuthToken('admin_token', 1, 'admin', -1, 'admin', '[admins]');

//        $accessObject = new AccessSet('admin_token', 'Super', []);
//        $accessObject->addAccessObjects("workspaceAdmin", "1");

    $this->mockAdminDao([
      'refreshAdminToken' => function(): void {
      },
      'getAdmin' => new Admin(1, 'super', '', true, 'admin_token'),
      'getWorkspaces' => [new WorkspaceData(1, 'workspace', 'RW')]
    ]);

    $response = SessionController::getSession(
      RequestCreator::create('GET', '/session')->withAttribute('AuthToken', $adminToken),
      ResponseCreator::createEmpty()
    );

    $response->getBody()->rewind();

    $this->assertEquals(
      '{"token":"admin_token","displayName":"super","customTexts":{},"flags":[],"claims":{"workspaceAdmin":[{"label":"workspace","id":"1","type":"workspaceAdmin","flags":{"mode":"RW"}}],"superAdmin":[]},"access":{"workspaceAdmin":["1"],"superAdmin":[]}}',
      $response->getBody()->getContents()
    );
  }

  public function test_getSession_unknownTokenType() {
    $unknownToken = new AuthToken('whoever', 1, 'unknown', -1, 'whatever', 'whatever');

    $this->expectException(HttpUnauthorizedException::class);
    SessionController::getSession(
      RequestCreator::create('GET', '/session')->withAttribute('AuthToken', $unknownToken),
      ResponseCreator::createEmpty()
    );
  }
}