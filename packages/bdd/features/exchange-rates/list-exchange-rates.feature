Feature: List Exchange Rates

  Scenario: List rates with default pagination sorted by effectiveAt DESC
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.90" at "2026-04-01T00:00:00.000Z"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I request the list of exchange rates
    Then the response status should be 200
    And the response should contain 2 exchange rates
    And the first listed exchange rate should be effective at "2026-05-01T00:00:00.000Z"

  Scenario: Filter by pair returns rows for that pair in either direction
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And a value exists named "GBP"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    And an exchange rate exists from "USD" to "GBP" with rate "0.79" at "2026-05-01T00:00:00.000Z"
    When I request the list of exchange rates filtered by pair "EUR" and "USD"
    Then the response status should be 200
    And the response should contain 1 exchange rates

  Scenario: Filter by as-of date excludes future-dated rows
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.90" at "2026-04-01T00:00:00.000Z"
    And an exchange rate exists from "USD" to "EUR" with rate "0.95" at "2099-01-01T00:00:00.000Z"
    When I request the list of exchange rates as of "2026-12-31T23:59:59.000Z"
    Then the response status should be 200
    And the response should contain 1 exchange rates

  Scenario: Unauthenticated user cannot list exchange rates
    When I request the list of exchange rates without authentication
    Then the response status should be 401
