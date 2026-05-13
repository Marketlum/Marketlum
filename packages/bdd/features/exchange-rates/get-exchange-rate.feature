Feature: Get Exchange Rate

  Scenario: Get a rate by ID
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I request the exchange rate
    Then the response status should be 200
    And the response should contain a rate with value "0.9200000000"

  Scenario: Getting a non-existent rate returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request the exchange rate with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
