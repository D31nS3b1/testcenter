#!/bin/bash

source backend/test/initialization/functions/functions.sh

echo_h1 "Blank installation of current Version";

take_current_version

php backend/initialize.php \
--user_name=super \
--user_password=user123 \
--workspace=a_beautiful_workspace \
--host=$MYSQL_HOST \
--port=$MYSQL_PORT \
--dbname=$MYSQL_DATABASE \
--user=$MYSQL_USER \
--password=$MYSQL_PASSWORD

expect_init_script_ok
expect_data_dir_equals sample_content_present
expect_table_to_have_rows files 10
expect_table_to_have_rows logins 12

echo_h2 "Delete a Teststakers File manually and sync the DB when initializing again"

unlink data/ws_1/Testtakers/SAMPLE_TESTTAKERS.XML

php backend/initialize.php

expect_init_script_ok
expect_table_to_have_rows files 9
expect_table_to_have_rows logins 0