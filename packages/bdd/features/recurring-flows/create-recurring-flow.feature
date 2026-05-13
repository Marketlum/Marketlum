Feature: Create Recurring Flow

  Scenario: Create a minimal recurring flow
    Given I am authenticated
    And a value stream "Sales" exists
    And an agent "Acme" exists
    When I create a recurring flow with stream "Sales", agent "Acme", direction "inbound", amount "5000", unit "USD", frequency "monthly", interval 1, startDate "2026-01-15"
    Then the response status should be 201
    And the response should contain a recurring flow with amount "5000.0000" and unit "USD"
    And the response should contain a recurring flow with status "draft"

  Scenario: Create a recurring flow with optional links and taxonomies
    Given I am authenticated
    And a value stream "Sales" exists
    And an agent "Acme" exists
    And a taxonomy "Subscription" exists
    When I create a recurring flow with stream "Sales", agent "Acme", direction "outbound", amount "1200", unit "USD", frequency "monthly", interval 1, startDate "2026-01-01" and taxonomy "Subscription"
    Then the response status should be 201
    And the response should contain a recurring flow with direction "outbound"
    And the response should contain a recurring flow with taxonomy "Subscription"

  Scenario: Reject creation with missing required field
    Given I am authenticated
    And a value stream "Sales" exists
    And an agent "Acme" exists
    When I create a recurring flow missing the amount field
    Then the response status should be 400

  Scenario: Reject creation referencing a non-existent value stream
    Given I am authenticated
    And an agent "Acme" exists
    When I create a recurring flow with a random value stream id, agent "Acme", direction "inbound", amount "5000", unit "USD", frequency "monthly", interval 1, startDate "2026-01-15"
    Then the response status should be 404

  Scenario: Reject creation with endDate before startDate
    Given I am authenticated
    And a value stream "Sales" exists
    And an agent "Acme" exists
    When I create a recurring flow with stream "Sales", agent "Acme", direction "inbound", amount "5000", unit "USD", frequency "monthly", interval 1, startDate "2026-02-01" and endDate "2026-01-01"
    Then the response status should be 400
