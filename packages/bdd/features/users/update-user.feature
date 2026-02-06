Feature: Update User

  Scenario: Successfully update a user's name
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I update the user's name to "Alice Updated"
    Then the response status should be 200
    And the response should contain a user with name "Alice Updated"

  Scenario: Update a non-existent user returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the user with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the user with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
