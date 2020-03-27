<?php /** @noinspection PhpUnhandledExceptionInspection */

use PHPUnit\Framework\TestCase;
require_once "classes/exception/HttpError.class.php";
require_once "classes/data-collection/DataCollection.class.php";
require_once "classes/helper/DB.class.php";
require_once "classes/data-collection/DBConfig.class.php";
require_once "classes/data-collection/LoginSession.class.php";
require_once "classes/helper/TimeStamp.class.php";
require_once "classes/dao/DAO.class.php";
require_once "classes/dao/SessionDAO.class.php";


class SessionDAOTest extends TestCase {

    private $dbc;
    /* @type DAO
     * @throws Exception
     */

    function setUp() {

        DB::connect(new DBConfig(["type" => "temp", "staticTokens" => true]));
        $this->dbc = new SessionDAO();
        $this->dbc->runFile('scripts/sql-schema/sqlite.sql');
        $this->dbc->runFile('test/testdata.sql');
    }


    function tearDown() {

        unset($this->dbc);
    }


    function test_createPerson() {

        $login = new LoginSession([
            "id" => 1,
            "_validTo" => TimeStamp::fromXMLFormat('1/1/2030 12:00')
        ]);
        $result = $this->dbc->createPerson($login, 'xxx');
        $expect = [
            'id' => 1,
            'token' => 'static_token_person_xxx',
            'login_id' => 1,
            'code' => 'xxx',
            'validTo' => 1893495600,
            'laststate' => null
        ];
        $this->assertEquals($result, $expect);
    }
}
