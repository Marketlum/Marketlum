Feature: System Base Value Setting

  Scenario: Getting the base value when unset returns null
    Given I am authenticated as "admin@marketlum.com"
    When I get the system base value
    Then the response status should be 200
    And the system base value should be null

  Scenario: Setting the base value
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    When I set the system base value to "USD"
    Then the response status should be 200
    And the system base value should be the ID of "USD"

  Scenario: Unauthenticated user cannot set the base value
    When I set the system base value to a value without authentication
    Then the response status should be 401
