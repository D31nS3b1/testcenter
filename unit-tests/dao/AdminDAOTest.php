<?php /** @noinspection PhpUnhandledExceptionInspection */

use PHPUnit\Framework\TestCase;
require_once "classes/exception/HttpError.class.php";
require_once "classes/data-collection/DataCollection.class.php";
require_once "classes/helper/DB.class.php";
require_once "classes/data-collection/DBConfig.class.php";
require_once "classes/helper/TimeStamp.class.php";
require_once "classes/helper/Password.class.php";
require_once "classes/dao/DAO.class.php";
require_once "classes/dao/AdminDAO.class.php";


class AdminDAOTest extends TestCase {

    private $dbc;
    /* @type DAO
     * @throws Exception
     */

    function setUp() {

        DB::connect(new DBConfig(["type" => "temp"]));
        $this->dbc = new AdminDAO();
        $this->dbc->runFile('scripts/sql-schema/sqlite.sql');
        $this->dbc->runFile('unit-tests/testdata.sql');
    }


    function tearDown() {

        unset($this->dbc);
    }


    function test_login() {

        $token = $this->dbc->createAdminToken('super', 'user123');
        $this->assertNotNull($token);

        $this->expectException("HttpError");
        $this->dbc->createAdminToken('peter', 'peterspassword');
    }


    function test_validateToken() {

        $token = $this->dbc->createAdminToken('super', 'user123');
        $result = $this->dbc->getAdmin($token);
        $this->assertEquals($result['userId'], '1');
        $this->assertEquals($result['name'], 'super');
        $this->assertEquals($result['isSuperadmin'], '1');
    }


    function test_getWorkspaces() {

        $token = $this->dbc->createAdminToken('super', 'user123');
        $result = $this->dbc->getWorkspaces($token);
        $expect = array(
            array(
                'id'    =>  1,
                'name'  =>  'example_workspace',
                'role'  => 'RW'
            )
        );
        $this->assertEquals($result, $expect);

        $token = $this->dbc->createAdminToken('i_exist_but_am_not_allowed_anything', 'user123');
        $result = $this->dbc->getWorkspaces($token);
        $this->assertEquals($result, array());
    }


    function test_hasAdminAccessToWorkspace() {

        $token = $this->dbc->createAdminToken('super', 'user123');
        $result = $this->dbc->hasAdminAccessToWorkspace($token, 1);
        $this->assertEquals($result, true);

        $token = $this->dbc->createAdminToken('i_exist_but_am_not_allowed_anything', 'user123');
        $result = $this->dbc->hasAdminAccessToWorkspace($token, 1);
        $this->assertEquals($result, false);
    }


    function test_getWorkspaceRole() {

        $token = $this->dbc->createAdminToken('super', 'user123');
        $result = $this->dbc->getWorkspaceRole($token, 1);
        $this->assertEquals($result, "RW");

        $token = $this->dbc->createAdminToken('i_exist_but_am_not_allowed_anything', 'user123');
        $result = $this->dbc->getWorkspaceRole($token, 1);
        $this->assertEquals($result, "");
    }


    function test_addCommand() {

        $command = new Command('command-id', 'a_keyword', 'first_argument', 'second_argument');
        $this->dbc->addCommand(1, 1, $command);
        $expectation = [
            "id" => 6,
            "uuid" => 'command-id',
            "test_id" => 1,
            "keyword" => 'a_keyword',
            "parameter" => '["first_argument","second_argument"]',
            "commander_id" => 1
        ];
        $result = $this->dbc->_("select * from test_commands where uuid='command-id'");
        $this->assertEquals($expectation, $result);
    }


    function test_getTest() {

        $expectation = [
            'locked' => '0',
            'id' => '1',
            'laststate' => '{"LASTUNIT":"1"}',
            'label' => 'first tests label'
        ];
        $result = $this->dbc->getTest(1);
        $this->assertEquals($expectation, $result);
    }
}
