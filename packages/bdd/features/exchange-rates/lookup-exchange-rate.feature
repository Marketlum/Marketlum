Feature: Lookup Exchange Rate

  Scenario: Symmetric lookup returns the stored rate in the canonical direction
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I look up the exchange rate from "USD" to "EUR" as of "2026-06-01T00:00:00.000Z"
    Then the response status should be 200
    And the looked-up rate should be "0.9200000000"

  Scenario: Symmetric lookup returns the inverted rate in the reverse direction
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I look up the exchange rate from "EUR" to "USD" as of "2026-06-01T00:00:00.000Z"
    Then the response status should be 200
    And the looked-up rate should be approximately "1.086956"

  Scenario: Lookup for a missing pair returns null
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "GBP"
    When I look up the exchange rate from "USD" to "GBP" as of "2026-06-01T00:00:00.000Z"
    Then the response status should be 200
    And the looked-up response should be null

  Scenario: Lookup picks the latest row with effectiveAt at or before the query time
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.90" at "2026-04-01T00:00:00.000Z"
    And an exchange rate exists from "USD" to "EUR" with rate "0.92" at "2026-05-01T00:00:00.000Z"
    When I look up the exchange rate from "USD" to "EUR" as of "2026-04-15T00:00:00.000Z"
    Then the response status should be 200
    And the looked-up rate should be "0.9000000000"

  Scenario: Future-dated rows are ignored when querying as of an earlier time
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "0.95" at "2099-01-01T00:00:00.000Z"
    When I look up the exchange rate from "USD" to "EUR" as of "2026-06-01T00:00:00.000Z"
    Then the response status should be 200
    And the looked-up response should be null
