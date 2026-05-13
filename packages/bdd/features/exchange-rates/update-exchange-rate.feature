Feature: Update Exchange Rate

  Scenario: Update the rate value
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I update the exchange rate with rate "0.93"
    Then the response status should be 200
    And the response should contain a rate with value "0.9300000000"

  Scenario: Update the source
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I update the exchange rate with source "ECB"
    Then the response status should be 200
    And the response source should be "ECB"

  Scenario: Updating to a duplicate (pair, effectiveAt) returns 409
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    And an exchange rate exists from "USD" to "EUR" with rate "0.95" at "2026-06-01T00:00:00.000Z"
    When I update the exchange rate with effectiveAt "2026-05-01T00:00:00.000Z"
    Then the response status should be 409
