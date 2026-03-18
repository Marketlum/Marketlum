Feature: List Locales

  Scenario: List locales with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And a locale exists with code "en-US"
    And a locale exists with code "pl"
    And a locale exists with code "fr-FR"
    When I request the list of locales
    Then the response status should be 200
    And the response should contain 3 locales

  Scenario: Unauthenticated user cannot list locales
    When I request the list of locales without authentication
    Then the response status should be 401
