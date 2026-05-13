Feature: Create Exchange Rate

  Scenario: Successfully create an exchange rate
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    When I create an exchange rate from "USD" to "EUR" with rate "0.92"
    Then the response status should be 201
    And the response should contain a rate with value "0.9200000000"

  Scenario: Submitting the pair reversed stores it canonically
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    When I create an exchange rate from "EUR" to "USD" with rate "1.0869565217"
    Then the response status should be 201
    And the canonical pair should match the lexicographic order of the value IDs

  Scenario: Rejecting a rate where fromValue equals toValue
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    When I create an exchange rate from "USD" to "USD" with rate "1"
    Then the response status should be 400

  Scenario: Rejecting a rate that is zero
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    When I create an exchange rate from "USD" to "EUR" with rate "0"
    Then the response status should be 400

  Scenario: Rejecting a duplicate rate for the same pair at the same effectiveAt
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I create an exchange rate from "USD" to "EUR" with rate "0.93" at "2026-05-01T00:00:00.000Z"
    Then the response status should be 409

  Scenario: Allowing a future-dated effectiveAt
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    When I create an exchange rate from "USD" to "EUR" with rate "0.95" at "2099-01-01T00:00:00.000Z"
    Then the response status should be 201

  Scenario: Unauthenticated user cannot create a rate
    When I create an exchange rate without authentication
    Then the response status should be 401
