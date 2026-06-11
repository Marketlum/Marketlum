Feature: Value stream financials

  Actual revenue and expenses for a value stream, aggregated from invoices and
  split by each invoice's direction. The actuals counterpart to the budget.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And the system presentation currency is "USD"
    And an agent exists named "Seller"
    And an agent exists named "Buyer"
    And a value stream exists named "Platform"

  Scenario: Revenue and expense are split by invoice direction
    Given a "revenue" invoice exists on "Platform" issued "2026-01-15" amount "1000"
    And an "expense" invoice exists on "Platform" issued "2026-02-15" amount "400"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials annual revenue should be "1000.00"
    And the financials annual expense should be "400.00"
    And the financials annual net should be "600.00"
    And the financials invoiceCount should be 2

  Scenario: Per-month figures land in the correct month
    Given a "revenue" invoice exists on "Platform" issued "2026-03-10" amount "1200"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials month "2026-03" revenue should be "1200.00"
    And the financials month "2026-01" revenue should be "0.00"

  Scenario: Subtree mode includes descendant invoices
    Given a child value stream "Frontend" exists under "Platform"
    And a "revenue" invoice exists on "Frontend" issued "2026-01-15" amount "1000"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials annual revenue should be "1000.00"

  Scenario: Direct-only excludes descendant invoices
    Given a child value stream "Frontend" exists under "Platform"
    And a "revenue" invoice exists on "Frontend" issued "2026-01-15" amount "1000"
    When I request the financials for "Platform" for year 2026 with directOnly true
    Then the response status should be 200
    And the financials annual revenue should be "0.00"

  Scenario: Invoices outside the requested year are excluded
    Given a "revenue" invoice exists on "Platform" issued "2025-06-15" amount "1000"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials annual revenue should be "0.00"
    And the financials invoiceCount should be 0

  Scenario: Missing presentation currency returns null figures with counts
    Given the system presentation currency is cleared
    And a "revenue" invoice exists on "Platform" issued "2026-01-15" amount "1000"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials presentationCurrency should be null
    And the financials annual revenue should be null
    And the financials invoiceCount should be 1

  Scenario: Unconverted line items increment notConvertedCount
    Given a value exists named "GBP"
    And a "revenue" invoice exists on "Platform" issued "2026-01-15" amount "1000" in currency "GBP"
    When I request the financials for "Platform" for year 2026
    Then the response status should be 200
    And the financials notConvertedCount should be 1
    And the financials annual revenue should be "0.00"

  Scenario: Requesting financials for a non-existent value stream returns 404
    When I request the financials for a non-existent value stream for year 2026
    Then the response status should be 404

  Scenario: Unauthenticated user cannot fetch financials
    When I request the financials for "Platform" for year 2026 without authentication
    Then the response status should be 401
