Feature: Change User Password

  Scenario: Successfully change a user's password
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I change the user's password to "newpassword456"
    Then the response status should be 200

  Scenario: Login works with the new password after change
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I change the user's password to "newpassword456"
    Then the response status should be 200
    And login with email "alice@marketlum.com" and password "newpassword456" should succeed
    And login with email "alice@marketlum.com" and password "password123" should fail

  Scenario: Change password with too short value returns 400
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I change the user's password to "abc"
    Then the response status should be 400

  Scenario: Change password for non-existent user returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I change the password of user with ID "00000000-0000-0000-0000-000000000000" to "newpassword456"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I change the password of user with ID "00000000-0000-0000-0000-000000000000" to "newpassword456"
    Then the response status should be 401
