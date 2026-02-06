Feature: Delete User

  Scenario: Successfully delete a user
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I delete the user
    Then the response status should be 204

  Scenario: Delete a non-existent user returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the user with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the user with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
