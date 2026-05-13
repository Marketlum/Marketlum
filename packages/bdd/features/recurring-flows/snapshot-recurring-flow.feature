Feature: Recurring flow rate snapshot

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And a value exists named "GBP"
    And the system base value is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2"

  Scenario: Recurring flow with no value has a null snapshot
    When I create a recurring flow with no value and amount "100"
    Then the response status should be 201
    And the flow rateUsed should be null
    And the flow baseAmount should be null

  Scenario: Recurring flow in the base value snapshots at rate 1
    When I create a recurring flow with value "USD" and amount "100"
    Then the response status should be 201
    And the flow rateUsed should be "1.0000000000"
    And the flow baseAmount should be "100.00"

  Scenario: Recurring flow in a non-base value snapshots using the inverse rate
    When I create a recurring flow with value "EUR" and amount "100"
    Then the response status should be 201
    And the flow rateUsed should be "0.5000000000"
    And the flow baseAmount should be "50.00"

  Scenario: Recurring flow in a value with no rate snapshots as NULL
    When I create a recurring flow with value "GBP" and amount "100"
    Then the response status should be 201
    And the flow rateUsed should be null
    And the flow baseAmount should be null

  Scenario: Changing the flow amount re-snapshots
    Given I created a recurring flow with value "EUR" and amount "100"
    When I update the flow amount to "200"
    Then the response status should be 200
    And the flow rateUsed should be "0.5000000000"
    And the flow baseAmount should be "100.00"

  Scenario: Changing the flow value re-snapshots
    Given I created a recurring flow with value "EUR" and amount "100"
    When I update the flow value to "USD"
    Then the response status should be 200
    And the flow rateUsed should be "1.0000000000"
    And the flow baseAmount should be "100.00"

  Scenario: Editing pure metadata leaves the snapshot untouched
    Given I created a recurring flow with value "EUR" and amount "100"
    When I update the flow description without changing monetary fields
    Then the response status should be 200
    And the flow rateUsed should be "0.5000000000"
    And the flow baseAmount should be "50.00"
