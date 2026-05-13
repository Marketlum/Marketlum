Feature: Recurring Flow Rollup

  Scenario: Rollup for an empty value stream
    Given I am authenticated
    And a value stream "Sales" exists
    When I get the rollup for value stream "Sales"
    Then the response status should be 200
    And the rollup activeFlowCount should be 0

  Scenario: Rollup for a stream with one active inbound monthly flow
    Given I am authenticated
    And a value stream "Sales" exists
    And an active monthly recurring flow with amount "5000" and unit "USD" and direction "inbound" exists for stream "Sales"
    When I get the rollup for value stream "Sales"
    Then the response status should be 200
    And the rollup activeFlowCount should be 1
    And the rollup inbound monthly total for "USD" should be "5000.0000"

  Scenario: Rollup with mixed inbound and outbound flows of the same unit
    Given I am authenticated
    And a value stream "Sales" exists
    And an active monthly recurring flow with amount "5000" and unit "USD" and direction "inbound" exists for stream "Sales"
    And an active monthly recurring flow with amount "1200" and unit "USD" and direction "outbound" exists for stream "Sales"
    When I get the rollup for value stream "Sales"
    Then the response status should be 200
    And the rollup net monthly total for "USD" should be "3800.0000"
