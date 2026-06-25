Feature: NBP exchange rate ingestion

  The NBP plugin pulls mid rates from Narodowy Bank Polski's table A and upserts
  them into the core exchange_rates table tagged source = "NBP". Only currencies
  the admin has chosen to track are ingested; a currency is matched to a core
  currency Value by ISO code, against the PLN Value as the counter-currency.
  Rates are stored through the core canonicalisation rules, so behaviour is
  asserted via rate lookups and the source tag rather than raw row direction.
  The NBP HTTP API is mocked in these scenarios.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "Polish Zloty" with code "PLN"
    And a currency value exists named "US Dollar" with code "USD"
    And a currency value exists named "Euro" with code "EUR"

  Scenario: A manual refresh ingests a tracked currency as an NBP-sourced rate
    Given the NBP plugin is configured to track "USD"
    And the NBP table A response provides a mid rate of "3.9512" for "USD" effective "2026-06-25"
    When I trigger an NBP refresh
    Then the response status should be 200
    And the refresh summary reports 1 currency updated
    And looking up the exchange rate from "USD" to "PLN" as of "2026-06-25T12:00:00.000Z" returns "3.9512000000"
    And exactly one exchange rate for the "USD"/"PLN" pair has source "NBP"

  Scenario: Currencies the admin does not track are not ingested
    Given the NBP plugin is configured to track "USD"
    And the NBP table A response provides a mid rate of "3.9512" for "USD" effective "2026-06-25"
    And the NBP table A response provides a mid rate of "4.2700" for "EUR" effective "2026-06-25"
    When I trigger an NBP refresh
    Then the response status should be 200
    And the refresh summary reports 1 currency updated
    And no exchange rate exists for the "EUR"/"PLN" pair

  Scenario: A tracked currency without a matching value is skipped and reported
    Given the NBP plugin is configured to track "USD"
    And the NBP table A response provides a mid rate of "3.9512" for "USD" effective "2026-06-25"
    And the NBP table A response provides a mid rate of "0.5400" for "XYZ" effective "2026-06-25"
    When I trigger an NBP refresh
    Then the response status should be 200
    And the refresh summary reports 1 currency updated
    And the refresh summary reports "XYZ" as skipped

  Scenario: A manually entered rate is never overwritten by NBP
    Given the NBP plugin is configured to track "USD"
    And an exchange rate exists from "USD" to "PLN" with rate "3.0000" at "2026-06-25T00:00:00.000Z"
    And the NBP table A response provides a mid rate of "3.9512" for "USD" effective "2026-06-25"
    When I trigger an NBP refresh
    Then the response status should be 200
    And the refresh summary reports 0 currencies updated
    And looking up the exchange rate from "USD" to "PLN" as of "2026-06-25T12:00:00.000Z" returns "3.0000000000"

  Scenario: Re-running the refresh is idempotent and updates the NBP row in place
    Given the NBP plugin is configured to track "USD"
    And the NBP table A response provides a mid rate of "3.9512" for "USD" effective "2026-06-25"
    When I trigger an NBP refresh
    And the NBP table A response provides a revised mid rate of "3.9600" for "USD" effective "2026-06-25"
    And I trigger an NBP refresh
    Then the response status should be 200
    And exactly one exchange rate for the "USD"/"PLN" pair has source "NBP"
    And looking up the exchange rate from "USD" to "PLN" as of "2026-06-25T12:00:00.000Z" returns "3.9600000000"

  Scenario: An unauthenticated user cannot trigger a refresh
    When I trigger an NBP refresh without authentication
    Then the response status should be 401
