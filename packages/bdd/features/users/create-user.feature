Feature: Create User

  Scenario: Successfully create a new user
    Given I am authenticated as "admin@marketlum.com"
    When I create a user with:
      | name  | email              | password    |
      | Alice | alice@marketlum.com | password123 |
    Then the response status should be 201
    And the response should contain a user with email "alice@marketlum.com"
    And the response should contain a user with name "Alice"

  Scenario: Creating a user with a duplicate email fails
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I create a user with:
      | name  | email              | password    |
      | Alice | alice@marketlum.com | password123 |
    Then the response status should be 409

  Scenario: Creating a user with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a user with:
      | name | email       | password |
      |      | not-an-email | 123      |
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a user with:
      | name  | email              | password    |
      | Alice | alice@marketlum.com | password123 |
    Then the response status should be 401
