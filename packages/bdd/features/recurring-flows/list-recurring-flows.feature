Feature: List Recurring Flows

  Scenario: List all recurring flows with default pagination
    Given I am authenticated
    And 3 recurring flows exist
    When I list recurring flows
    Then the response status should be 200
    And the response should contain 3 recurring flows

  Scenario: Filter recurring flows by direction
    Given I am authenticated
    And 2 inbound recurring flows exist
    And 1 outbound recurring flow exists
    When I list recurring flows filtered by direction "inbound"
    Then the response status should be 200
    And the response should contain 2 recurring flows

  Scenario: Filter recurring flows by status
    Given I am authenticated
    And 2 active recurring flows exist
    And 1 draft recurring flow exists
    When I list recurring flows filtered by status "active"
    Then the response status should be 200
    And the response should contain 2 recurring flows

  Scenario: Sort recurring flows by amount
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And a recurring flow with amount "500" exists
    And a recurring flow with amount "300" exists
    When I list recurring flows sorted by amount ascending
    Then the response status should be 200
    And the first recurring flow amount should be "100.0000"
