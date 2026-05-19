Feature: System Presentation Currency Setting

  Scenario: Getting the presentation currency when unset returns null
    Given I am authenticated as "admin@marketlum.com"
    When I get the system presentation currency
    Then the response status should be 200
    And the system presentation currency should be null

  Scenario: Setting the presentation currency
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    When I set the system presentation currency to "USD"
    Then the response status should be 200
    And the system presentation currency should be the ID of "USD"

  Scenario: Cannot change presentation currency once snapshots exist
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And the system presentation currency is set to "USD"
    And a recurring flow exists with a presentation snapshot
    When I set the system presentation currency to "EUR"
    Then the response status should be 409

  Scenario: Unauthenticated user cannot set the presentation currency
    When I set the system presentation currency to a value without authentication
    Then the response status should be 401
