Feature: Recurring flow rate snapshot

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And a value exists named "GBP"
    And the system presentation currency is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2"

  Scenario: Missing currency rejects the create
    When I create a recurring flow without a currency and amount "100"
    Then the response status should be 400

  Scenario: Recurring flow in the base currency snapshots at rate 1
    When I create a recurring flow with currency "USD" and amount "100"
    Then the response status should be 201
    And the flow presentationRate should be "1.0000000000"
    And the flow presentationAmount should be "100.00"

  Scenario: Recurring flow in a non-base currency snapshots using the inverse rate
    When I create a recurring flow with currency "EUR" and amount "100"
    Then the response status should be 201
    And the flow presentationRate should be "0.5000000000"
    And the flow presentationAmount should be "50.00"

  Scenario: Recurring flow in a currency with no rate snapshots as NULL
    When I create a recurring flow with currency "GBP" and amount "100"
    Then the response status should be 201
    And the flow presentationRate should be null
    And the flow presentationAmount should be null

  Scenario: Changing the flow amount re-snapshots
    Given I created a recurring flow with currency "EUR" and amount "100"
    When I update the flow amount to "200"
    Then the response status should be 200
    And the flow presentationRate should be "0.5000000000"
    And the flow presentationAmount should be "100.00"

  Scenario: Changing the flow currency re-snapshots
    Given I created a recurring flow with currency "EUR" and amount "100"
    When I update the flow currency to "USD"
    Then the response status should be 200
    And the flow presentationRate should be "1.0000000000"
    And the flow presentationAmount should be "100.00"

  Scenario: Editing pure metadata leaves the snapshot untouched
    Given I created a recurring flow with currency "EUR" and amount "100"
    When I update the flow description without changing monetary fields
    Then the response status should be 200
    And the flow presentationRate should be "0.5000000000"
    And the flow presentationAmount should be "50.00"
