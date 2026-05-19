Feature: Recurring flow snapshot per agent

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And a currency value exists named "EUR"
    And the system presentation currency is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"

  Scenario: Inbound flow maps counterparty to fromAgent and value-stream agent to toAgent
    Given an agent exists named "Internal" with functional currency "EUR"
    And an agent exists named "Vendor" with functional currency "USD"
    And a value stream exists named "Platform" with agent "Internal"
    When I create an inbound recurring flow on "Platform" with counterparty "Vendor" currency "USD" amount "100" starting "2026-01-01"
    Then the response status should be 201
    And the flow fromAgentRate should be "1.0000000000"
    And the flow toAgentRate should be "2.0000000000"
    And the flow toAgentAmount should be "200.00"

  Scenario: Outbound flow reverses the from/to mapping
    Given an agent exists named "Internal" with functional currency "EUR"
    And an agent exists named "Vendor" with functional currency "USD"
    And a value stream exists named "Platform" with agent "Internal"
    When I create an outbound recurring flow on "Platform" with counterparty "Vendor" currency "USD" amount "100" starting "2026-01-01"
    Then the response status should be 201
    And the flow fromAgentRate should be "2.0000000000"
    And the flow fromAgentAmount should be "200.00"
    And the flow toAgentRate should be "1.0000000000"

  Scenario: Value stream without an agent leaves the value-stream-side snapshot NULL
    Given an agent exists named "Vendor" with functional currency "USD"
    And a value stream exists named "Platform" without an agent
    When I create an inbound recurring flow on "Platform" with counterparty "Vendor" currency "USD" amount "100" starting "2026-01-01"
    Then the response status should be 201
    And the flow fromAgentRate should be "1.0000000000"
    And the flow toAgentRate should be null
    And the flow toAgentAmount should be null
