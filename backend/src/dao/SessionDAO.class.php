<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);

class SessionDAO extends DAO {
  public function getToken(string $tokenString, array $requiredTypes): AuthToken {
    $tokenInfo = $this->_(
      'select
                    admin_sessions.token,
                    users.id,
                    \'admin\' as "type",
                    -1 as "workspaceId",
                    case when (users.is_superadmin) then \'super-admin\' else \'admin\' end as "mode",
                    valid_until as "validTo",
                    \'[admins]\' as "group"
                from admin_sessions
                     left join users on (users.id = admin_sessions.user_id)
                where
                    admin_sessions.token = :token
            union
                select
                    person_sessions.token,
                    person_sessions.id as "id",
                    \'person\' as "type",
                    logins.workspace_id as "workspaceId",
                    logins.mode,
                    person_sessions.valid_until as "validTo",
                    logins.group_name as "group"
                from person_sessions
                     left join login_sessions on (person_sessions.login_sessions_id = login_sessions.id)
                     left join logins on (logins.name = login_sessions.name)
                where
                    person_sessions.token = :token
            union
                select
                    token,
                    login_sessions.id as "id",
                    \'login\' as "type",
                    logins.workspace_id as "workspaceId",
                    logins.mode,
                    logins.valid_to as "validTo",
                    logins.group_name as "group"
                from login_sessions
                     left join logins on (logins.name = login_sessions.name)
                where
                    login_sessions.token = :token
            limit 1',
      [':token' => $tokenString]
    );

    if ($tokenInfo == null) {
      throw new HttpError("Invalid token: `$tokenString`", 403);
    }

    if ($tokenInfo['workspaceId'] == null) {
      throw new HttpError("Login removed: `$tokenString`", 410);
    }

    if (!in_array($tokenInfo["type"], $requiredTypes)) {
      throw new HttpError("Token `$tokenString` of "
        . "type `{$tokenInfo["type"]}` has wrong type - `"
        . implode("` or `", $requiredTypes) . "` required.", 403);
    }

    TimeStamp::checkExpiration(0, TimeStamp::fromSQLFormat($tokenInfo['validTo']));

    return new AuthToken(
      $tokenInfo['token'],
      (int) $tokenInfo['id'],
      $tokenInfo['type'],
      (int) $tokenInfo['workspaceId'],
      $tokenInfo['mode'],
      $tokenInfo['group']
    );
  }

  /**
   * @codeCoverageIgnore
   */
  public function getOrCreateLoginSession(string $name, string $password): ?LoginSession {
    $login = $this->getLogin($name, $password);

    if (!$login) {
      return null;
    }

    return $this->createLoginSession($login);
  }

  public function getLogin(string $name, string $password): ?Login {
    $login = $this->_(
      'select         
              logins.name,
              logins.mode,
              logins.group_name,
              logins.group_label,
              login_session_groups.token as group_token,
              logins.codes_to_booklets,
              logins.workspace_id,
              logins.valid_to,
              logins.valid_from,
              logins.valid_for,
              logins.custom_texts,
              logins.password
            from 
              logins
              left join login_sessions on (logins.name = login_sessions.name)
              left join login_session_groups on (logins.group_name = login_session_groups.group_name)
            where 
              logins.name = :name',
      [
        ':name' => $name
      ]
    );

    // we always check one password to not leak the existence of username to time-attacks
    if (!$login) {
      $login = ['password' => 'dummy'];
    }

    // TODO also use customizable use salt for testees? -> change would break current sessions
    if (!Password::verify($password, $login['password'], 't')) {
      return null;
    }

    TimeStamp::checkExpiration(
      TimeStamp::fromSQLFormat($login['valid_from']),
      TimeStamp::fromSQLFormat($login['valid_to'])
    );

    return new Login(
      $login['name'],
      '',
      $login['mode'],
      $login['group_name'],
      $login['group_label'],
      JSON::decode($login['codes_to_booklets'], true),
      (int) $login['workspace_id'],
      TimeStamp::fromSQLFormat($login['valid_to']),
      TimeStamp::fromSQLFormat($login['valid_from']),
      (int) $login['valid_for'],
      JSON::decode($login['custom_texts'])
    );
  }

  public function createLoginSession(Login $login): LoginSession {
    $loginToken = Token::generate('login', $login->getName());
    $groupToken = $this->getOrCreateGroupToken($login);

    // We don't check for existence of the sessions before inserting it because timing issues occurred: If the same
    // login was requested two times at the same moment it could happen that it was created twice.

    $this->_(
      'insert ignore into login_sessions (token, name, workspace_id, group_name)
                values(:token, :name, :ws, :group_name)',
      [
        ':token' => $loginToken,
        ':name' => $login->getName(),
        ':ws' => $login->getWorkspaceId(),
        ':group_name' => $login->getGroupName()
      ]
    );

    if ($this->lastAffectedRows) {
      return new LoginSession(
        (int) $this->pdoDBhandle->lastInsertId(),
        $loginToken,
        $groupToken,
        $login
      );
    }

    // there is no way in mySQL to combine insert & select into one query

    $session = $this->_(
      'select id, token from login_sessions where name = :name and workspace_id = :ws_id',
      [
        ':name' => $login->getName(),
        ':ws_id' => $login->getWorkspaceId()
      ]
    );

    return new LoginSession((int) $session['id'], $session['token'], $groupToken, $login);
  }

  public function getLoginSessionByToken(string $loginToken): LoginSession {
    $loginSession = $this->_(
      'select 
                    login_sessions.id, 
                    logins.name,
                    login_sessions.token,
                    logins.mode,
                    logins.group_name,
                    logins.group_label,
                    login_session_groups.token as group_token,
                    logins.codes_to_booklets,
                    login_sessions.workspace_id,
                    logins.custom_texts,
                    logins.password,
                    logins.valid_for,
                    logins.valid_to,
                    logins.valid_from
                from
                    logins
                    left join login_sessions on (logins.name = login_sessions.name)
                    left join login_session_groups on (logins.group_name = login_session_groups.group_name)
                where
                    login_sessions.token=:token',
      [':token' => $loginToken]
    );

    if ($loginSession == null) {
      throw new HttpError("LoginToken invalid: `$loginToken`", 403);
    }

    TimeStamp::checkExpiration(
      TimeStamp::fromSQLFormat($loginSession['valid_from']),
      TimeStamp::fromSQLFormat($loginSession['valid_to'])
    );

    return new LoginSession(
      (int) $loginSession["id"],
      $loginSession["token"],
      $loginSession["group_token"],
      new Login(
        $loginSession['name'],
        '',
        $loginSession['mode'],
        $loginSession['group_name'],
        $loginSession['group_label'],
        JSON::decode($loginSession['codes_to_booklets'], true),
        (int) $loginSession['workspace_id'],
        TimeStamp::fromSQLFormat($loginSession['valid_to']),
        TimeStamp::fromSQLFormat($loginSession['valid_from']),
        (int) $loginSession['valid_for'],
        JSON::decode($loginSession['custom_texts'])
      )
    );
  }

  public function getLoginsByGroup(string $groupName, int $workspaceId): array {
    $logins = [];

    $result = $this->_(
      'select 
                    logins.name,
                    logins.mode,
                    logins.group_name,
                    logins.group_label,
                    login_session_groups.token as group_token,
                    logins.codes_to_booklets,
                    logins.custom_texts,
                    logins.password,
                    logins.valid_for,
                    logins.valid_to,
                    logins.valid_from,
                    logins.workspace_id,
                    login_sessions.id,
                    login_sessions.token
                from
                    logins
                    left join login_sessions on (logins.name = login_sessions.name)
                    left join login_session_groups on (logins.group_name = login_session_groups.group_name)
                where
                    logins.group_name = :group_name and logins.workspace_id = :workspace_id',
      [
        ':group_name' => $groupName,
        ':workspace_id' => $workspaceId
      ],
      true
    );

    foreach ($result as $row) {
      $logins[] =
        new LoginSession(
          (int) $row["id"],
          $row["token"],
          $row["group_token"],
          new Login(
            $row['name'],
            '',
            $row['mode'],
            $row['group_name'],
            $row['group_label'],
            JSON::decode($row['codes_to_booklets'], true),
            (int) $row['workspace_id'],
            TimeStamp::fromSQLFormat($row['valid_to']),
            TimeStamp::fromSQLFormat($row['valid_from']),
            (int) $row['valid_for'],
            JSON::decode($row['custom_texts'])
          )
        );
    }

    return $logins;
  }

  public function createOrUpdatePersonSession(LoginSession $loginSession, string $code, bool $allowExpired = false): PersonSession {
    $login = $loginSession->getLogin();

    if (count($login->getBooklets()) and !array_key_exists($code, $login->getBooklets())) {
      throw new HttpError("`$code` is no valid code for `{$login->getName()}`", 400);
    }

    if (!$allowExpired) {
      TimeStamp::checkExpiration($login->getValidFrom(), $login->getValidTo());
    }

    $newPersonToken = Token::generate('person', "{$login->getGroupName()}_{$login->getName()}_$code");

    $suffix = [];
    if ($code) {
      $suffix[] = $code;
    }
    if (Mode::hasCapability($loginSession->getLogin()->getMode(), 'alwaysNewSession')) {
      // we use random strings to identify the persons, not subsequent numbers, because that caused trouble when
      // two logged in in the very same moment
      $suffix[] = Random::string(8, false);
    }
    $suffix = implode('/', $suffix);

    if (!Mode::hasCapability($loginSession->getLogin()->getMode(), 'alwaysNewSession')) {
      $personSession = $this->_('
        select id, valid_until from person_sessions where login_sessions_id = :lsi and name_suffix = :suffix',
        [
          ':lsi' => $loginSession->getId(),
          ':suffix' => $suffix
        ]
      );
      if ($personSession) {
        TimeStamp::checkExpiration(0, TimeStamp::fromSQLFormat($personSession['valid_until']));
        $this->_(
          'update person_sessions set token=:token where login_sessions_id = :lsi and name_suffix = :suffix',
          [
            ':lsi' => $loginSession->getId(),
            ':suffix' => $suffix,
            ':token' => $newPersonToken
          ]
        );
        return new PersonSession(
          $loginSession,
          new Person(
            $personSession['id'],
            $newPersonToken,
            $code,
            $suffix,
            TimeStamp::fromSQLFormat($personSession['valid_until'])
          )
        );
      }
    }

    $validUntil = TimeStamp::expirationFromNow($login->getValidTo(), $login->getValidForMinutes());

    try {
      $this->_(
        "insert into person_sessions (token, code, login_sessions_id, valid_until, name_suffix)
            values (:token, :code, :login_id, :valid_until, :suffix)",
        [
          ':token' => $newPersonToken,
          ':code' => $code,
          ':login_id' => $loginSession->getId(),
          ':valid_until' => TimeStamp::toSQLFormat($validUntil),
          ':suffix' => $suffix
        ]
      );
    } catch (Exception $ee) {
      if ($ee->getPrevious() and ($ee->getPrevious()->getCode() == 23000)) {
        error_log("Create person-session: retry on duplicate suffix ({$loginSession->getLogin()->getName()})");
        // allow retry on duplicate suffix - extremely unlikely in prod, but happens in test environment
        return $this->createOrUpdatePersonSession($loginSession, $code, $allowExpired);
      }
    }


    return new PersonSession(
      $loginSession,
      new Person(
        (int) $this->pdoDBhandle->lastInsertId(),
        $newPersonToken,
        $code,
        $suffix,
        $validUntil
      )
    );
  }

  public function getPersonSessionByToken(string $personToken): PersonSession {
    $personSession = $this->_(
      'select 
                login_sessions.id,
                logins.codes_to_booklets,
                login_sessions.workspace_id,
                logins.mode,
                logins.password,
                logins.group_name,
                logins.group_label,
                login_session_groups.token as group_token,
                login_sessions.token,
                login_sessions.name,
                logins.custom_texts,
                logins.valid_to,
                logins.valid_from,
                logins.valid_for,
                person_sessions.id as "person_id",
                person_sessions.code,
                person_sessions.valid_until,
                person_sessions.name_suffix
            from person_sessions
                inner join login_sessions on login_sessions.id = person_sessions.login_sessions_id
                inner join logins on logins.name = login_sessions.name
                left join login_session_groups on (logins.group_name = login_session_groups.group_name)
            where person_sessions.token = :token',
      [':token' => $personToken]
    );

    if ($personSession === null) {
      throw new HttpError("PersonToken invalid: `$personToken`", 403);
    }

    TimeStamp::checkExpiration(0, Timestamp::fromSQLFormat($personSession['valid_until']));
    TimeStamp::checkExpiration(
      TimeStamp::fromSQLFormat($personSession['valid_from']),
      TimeStamp::fromSQLFormat($personSession['valid_to'])
    );

    return new PersonSession(
      new LoginSession(
        (int) $personSession['id'],
        $personSession['token'],
        $personSession['group_token'],
        new Login(
          $personSession['name'],
          '',
          $personSession['mode'],
          $personSession['group_name'],
          $personSession['group_label'],
          JSON::decode($personSession['codes_to_booklets'], true),
          (int) $personSession['workspace_id'],
          Timestamp::fromSQLFormat($personSession['valid_to']),
          Timestamp::fromSQLFormat($personSession['valid_from']),
          $personSession['valid_for'],
          JSON::decode($personSession['custom_texts'])
        )
      ),
      new Person(
        (int) $personSession['person_id'],
        $personToken,
        $personSession['code'] ?? '',
        $personSession['name_suffix'] ?? '',
        TimeStamp::fromSQLFormat($personSession['valid_until'])
      )
    );
  }

  public function getOrCreateGroupToken(Login $login): string {
    $res = $this->_('select token from login_session_groups where group_name = ?', [$login->getGroupName()]);

    if ($res['token']) {
      return $res['token'];
    }

    $newGroupToken = Token::generate('group', $login->getGroupName());
    $this->_(
      'insert into login_session_groups (group_name, group_label, token) values (?, ?, ?)',
      [
        $login->getGroupName(),
        $login->getGroupLabel(),
        $newGroupToken
      ]
    );
    return $newGroupToken;
  }

  public function getTestStatus(string $personToken, string $bookletName): array {
    $testStatus = $this->_(
      'select
             tests.locked,
             tests.running,
             files.label
            from
              person_sessions
              left join login_sessions on (person_sessions.login_sessions_id = login_sessions.id)
              left join logins on (logins.name = login_sessions.name)
              left join files on (files.workspace_id = logins.workspace_id)
              left join tests on (person_sessions.id = tests.person_id and tests.name = files.id)
            where person_sessions.token = :token
              and files.id = :bookletname',
      [
        ':token' => $personToken,
        ':bookletname' => $bookletName
      ]
    );

    if ($testStatus == null) {
      throw new HttpError("Test `$bookletName` not found!", 404);
    }

    $testStatus['running'] = (bool) $testStatus['running'];
    $testStatus['locked'] = (bool) $testStatus['locked'];

    return $testStatus;
  }

  public function personHasBooklet(string $personToken, string $bookletName): bool {
    $bookletDef = $this->_('
            select
              logins.codes_to_booklets,
              login_sessions.id,
              person_sessions.code
            from logins
              left join login_sessions on logins.name = login_sessions.name
              left join person_sessions on login_sessions.id = person_sessions.login_sessions_id
            where
              person_sessions.token = :token',
      [
        ':token' => $personToken
      ]
    );

    $code = $bookletDef['code'];
    $codes2booklets = JSON::decode($bookletDef['codes_to_booklets'], true);

    return $codes2booklets and isset($codes2booklets[$code]) and in_array($bookletName, $codes2booklets[$code]);
  }

  public function ownsTest(string $personToken, string $testId): bool {
    $test = $this->_(
      'select tests.locked from tests
              inner join person_sessions on person_sessions.id = tests.person_id
              where person_sessions.token=:token and tests.id=:testId',
      [
        ':token' => $personToken,
        ':testId' => $testId
      ]
    );

    return !!$test;
  }

  public function getTestsOfPerson(PersonSession $personSession): array {
    $bookletIds = $personSession->getLoginSession()->getLogin()->getBooklets()[$personSession->getPerson()->getCode() ?? ''];
    if (!count($bookletIds)) {
      return [];
    }
    $placeHolder = implode(', ', array_fill(0, count($bookletIds), '?'));
    $sql = "select
              tests.person_id,
              tests.id,
              tests.locked,
              tests.running,
              files.name,
              files.id as bookletId,
              files.label as testLabel,
              files.description
            from files
              left outer join tests on files.id = tests.name and tests.person_id = ?
            where
              files.workspace_id = ?
              and files.type = 'Booklet'
              and files.id in ($placeHolder)
            order by
              files.label";
    $tests = $this->_(
      $sql,
      [
        $personSession->getPerson()->getId(),
        $personSession->getLoginSession()->getLogin()->getWorkspaceId(),
        ...$bookletIds
      ],
      true
    );
    return array_map(
      function(array $res): TestData {
        return new TestData(
          $res['bookletId'],
          $res['testLabel'],
          $res['description'],
          (bool) $res['locked'],
          (bool) $res['running']
        );
      },
      $tests
    );
  }

  public function deletePersonToken(AuthToken $authToken): void {
    // we can not delete the session entirely, because this would delete the whole response data.
    $this->_("update person_sessions set token=null where token = :token", [':token' => $authToken->getToken()]);
  }

  public function getGroupMonitors(PersonSession $personSession): array {
    switch ($personSession->getLoginSession()->getLogin()->getMode()) {
      default: return [];
      case 'monitor-group':
        return [
          new Group(
            $personSession->getLoginSession()->getLogin()->getGroupName(),
            $personSession->getLoginSession()->getLogin()->getGroupLabel()
          )
        ];
      case 'monitor-study':
        return $this->getGroups($personSession->getLoginSession()->getLogin()->getWorkspaceId());
    }
  }

  public function getGroups(int $workspaceId): array {
    $modeSelector = "mode in ('" . implode("', '", Mode::getByCapability('monitorable')) . "')";
    $sql =
      "select
        group_name,
        group_label,
        valid_from,
        valid_to
      from
        logins
      where
        workspace_id = :ws_id
        and $modeSelector
      group by group_name, group_label, valid_from, valid_to
      order by group_label";

    return array_reduce(
      $this->_($sql, [':ws_id' => $workspaceId], true),
      function(array $agg, array $row): array {
        $expiration = TimeStamp::isExpired(
          TimeStamp::fromSQLFormat($row['valid_from']),
          TimeStamp::fromSQLFormat($row['valid_to'])
        );
        $agg[$row['group_name']] = new Group($row['group_name'], $row['group_label'], $expiration);
        return $agg;
      },
      []
    );
  }

  public function getDependantSessions(LoginSession $login): array {
    return match ($login->getLogin()->getMode()) {
      'monitor-group' => $this->getLoginSessions([
        'logins.workspace_id' => $login->getLogin()->getWorkspaceId(),
        'logins.group_name' => $login->getLogin()->getGroupName()
      ]),
      'monitor-study' => $this->getLoginSessions([
        'logins.workspace_id' => $login->getLogin()->getWorkspaceId()
      ]),
      default => [],
    };
  }
}
