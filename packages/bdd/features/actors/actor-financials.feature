Feature: Actor financials

  An actor's profit & loss statement for a calendar year, aggregated from
  invoices in the actor's own perspective: invoices the actor issued are
  revenue, invoices the actor received are expense. Figures
  are reported in the actor's functional currency using the per-actor
  snapshot totals; invoices whose relevant per-actor total is missing are
  excluded from sums and surfaced through notConvertedCount.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an actor exists named "Acme" with functional currency "USD"
    And an actor exists named "Globex" with functional currency "USD"

  Scenario: Issued invoices are revenue and received invoices are expense
    Given an invoice exists from "Acme" to "Globex" issued "2026-01-15" amount "1000"
    And an invoice exists from "Globex" to "Acme" issued "2026-02-10" amount "400"
    When I request the financials of "Acme" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "1000.00"
    And the actor financials annual expense should be "400.00"
    And the actor financials annual net should be "600.00"
    And the actor financials invoiceCount should be 2

  Scenario: Figures land in the correct month and quarter
    Given an invoice exists from "Acme" to "Globex" issued "2026-03-10" amount "1200"
    When I request the financials of "Acme" for year 2026
    Then the response status should be 200
    And the actor financials month "2026-03" revenue should be "1200.00"
    And the actor financials month "2026-01" revenue should be "0.00"
    And the actor financials quarter "2026-Q1" revenue should be "1200.00"
    And the actor financials quarter "2026-Q2" revenue should be "0.00"

  Scenario: Amounts are converted into the actor's functional currency
    Given a currency value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"
    And an actor exists named "Euro Corp" with functional currency "EUR"
    And an invoice exists from "Euro Corp" to "Globex" in "USD" issued "2026-01-15" amount "100"
    When I request the financials of "Euro Corp" for year 2026
    Then the response status should be 200
    And the actor financials functional currency should be "EUR"
    And the actor financials annual revenue should be "200.00"

  Scenario: Invoices without a per-actor snapshot are excluded and counted
    Given a currency value exists named "EUR"
    And a currency value exists named "GBP"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"
    And an actor exists named "Euro Corp" with functional currency "EUR"
    And an invoice exists from "Euro Corp" to "Globex" in "USD" issued "2026-01-15" amount "100"
    And an invoice exists from "Euro Corp" to "Globex" in "GBP" issued "2026-02-15" amount "300"
    When I request the financials of "Euro Corp" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "200.00"
    And the actor financials invoiceCount should be 2
    And the actor financials notConvertedCount should be 1

  Scenario: Invoices outside the requested year are excluded
    Given an invoice exists from "Acme" to "Globex" issued "2025-12-31" amount "999"
    And an invoice exists from "Acme" to "Globex" issued "2026-01-01" amount "100"
    When I request the financials of "Acme" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "100.00"
    And the actor financials invoiceCount should be 1

  Scenario: Unpaid invoices are included in the accrual view
    Given an unpaid invoice exists from "Acme" to "Globex" issued "2026-01-15" amount "750"
    When I request the financials of "Acme" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "750.00"

  Scenario: An actor without a functional currency gets null figures with counts
    Given an actor exists named "NoCur" without a functional currency
    And an invoice exists from "NoCur" to "Globex" issued "2026-01-15" amount "100"
    When I request the financials of "NoCur" for year 2026
    Then the response status should be 200
    And the actor financials functional currency should be null
    And the actor financials annual revenue should be null
    And the actor financials invoiceCount should be 1

  Scenario: A self-invoice counts as both revenue and expense
    Given an invoice exists from "Acme" to "Acme" issued "2026-01-15" amount "100"
    When I request the financials of "Acme" for year 2026
    Then the response status should be 200
    And the actor financials annual revenue should be "100.00"
    And the actor financials annual expense should be "100.00"
    And the actor financials annual net should be "0.00"
    And the actor financials invoiceCount should be 1

  Scenario: Requesting financials for a non-existent actor returns 404
    When I request the financials of a non-existent actor for year 2026
    Then the response status should be 404

  Scenario: Unauthenticated user cannot fetch actor financials
    When I request the financials of "Acme" for year 2026 without authentication
    Then the response status should be 401
