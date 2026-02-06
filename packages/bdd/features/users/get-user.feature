Feature: Get User

  Scenario: Get an existing user by ID
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I request the user by their ID
    Then the response status should be 200
    And the response should contain a user with email "alice@marketlum.com"

  Scenario: Get a non-existent user returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a user with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a user with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
