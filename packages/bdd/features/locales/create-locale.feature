Feature: Create Locale

  Scenario: Successfully create a locale
    Given I am authenticated as "admin@marketlum.com"
    When I create a locale with code "en-US"
    Then the response status should be 201
    And the response should contain a locale with code "en-US"

  Scenario: Creating a locale with duplicate code fails
    Given I am authenticated as "admin@marketlum.com"
    And a locale exists with code "en-US"
    When I create a locale with code "en-US"
    Then the response status should be 409

  Scenario: Creating a locale with invalid code fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a locale with code "invalid-xxx"
    Then the response status should be 400

  Scenario: Creating a locale without code fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a locale without code
    Then the response status should be 400

  Scenario: Unauthenticated user cannot create a locale
    When I create a locale without authentication
    Then the response status should be 401
