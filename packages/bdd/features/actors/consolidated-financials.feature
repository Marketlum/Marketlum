Feature: Consolidated actor financials

  With consolidated=true the actor financials cover the actor's whole
  subtree: descendants' invoices are included and internal invoices between
  subtree members are eliminated, so an on-behalf deal counts exactly once.
  Amounts stay in the consolidating actor's functional currency; a subtree
  invoice whose own side-actor uses a different functional currency cannot
  be summed and is surfaced through notConvertedCount instead.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an actor exists named "Holding" of type "organization" with functional currency "USD"
    And an actor exists named "Subsidiary" of type "organization" with functional currency "USD" under parent "Holding"
    And an actor exists named "Studio" of type "virtual" with functional currency "USD" under parent "Holding"
    And an actor exists named "Customer" of type "organization" with functional currency "USD"

  Scenario: Consolidated view includes descendant revenue
    Given an invoice exists from "Subsidiary" to "Customer" issued "2026-01-15" amount "1000"
    When I request the consolidated financials of "Holding" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "1000.00"
    And the actor financials invoiceCount should be 1

  Scenario: Standalone view does not include descendant revenue
    Given an invoice exists from "Subsidiary" to "Customer" issued "2026-01-15" amount "1000"
    When I request the financials of "Holding" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "0.00"
    And the actor financials invoiceCount should be 0

  Scenario: Intercompany internal invoices are eliminated in the consolidated view
    Given an on-behalf invoice exists numbered "FV-50" from "Holding" to "Customer" on behalf of "Studio" issued "2026-01-15" amount "100"
    When I request the consolidated financials of "Holding" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "100.00"
    And the actor financials annual expense should be "0.00"
    And the actor financials annual net should be "100.00"
    And the actor financials invoiceCount should be 1

  Scenario: The standalone view of an on-behalf issuer nets to zero
    Given an on-behalf invoice exists numbered "FV-51" from "Holding" to "Customer" on behalf of "Studio" issued "2026-01-15" amount "100"
    When I request the financials of "Holding" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "100.00"
    And the actor financials annual expense should be "100.00"
    And the actor financials annual net should be "0.00"

  Scenario: A descendant with a different functional currency is counted as not converted
    Given a currency value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"
    And an actor exists named "Euro Sub" of type "organization" with functional currency "EUR" under parent "Holding"
    And an invoice exists from "Euro Sub" to "Customer" issued "2026-01-15" amount "100"
    When I request the consolidated financials of "Holding" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "0.00"
    And the actor financials notConvertedCount should be 1
    And the actor financials invoiceCount should be 1

  Scenario: Consolidated financials of a leaf actor equal the standalone view
    Given an invoice exists from "Subsidiary" to "Customer" issued "2026-01-15" amount "300"
    When I request the consolidated financials of "Subsidiary" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "300.00"
    And the actor financials invoiceCount should be 1
