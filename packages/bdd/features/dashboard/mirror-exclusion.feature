Feature: Dashboard mirror exclusion

  Mirror invoices are intra-group bookkeeping and are excluded from the
  dashboard aggregates, so a deal invoiced on behalf of a sub-agent is
  counted exactly once. Genuine internal invoices remain included.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "USD"
    And an agent exists named "Holding" of type "organization"
    And an agent exists named "Studio" of type "virtual" under parent "Holding"
    And an agent exists named "Customer" of type "organization"

  Scenario: Mirror invoices are not counted in dashboard totals
    Given an on-behalf invoice exists numbered "FV-60" from "Holding" to "Customer" on behalf of "Studio" issued at "2025-01-15" totalling "100.00"
    When I request the dashboard summary
    Then the response status should be 200
    And the response should contain totalRevenue "100.00"
    And the response should contain invoiceCount 1

  Scenario: Genuine internal invoices remain included
    Given an internal invoice exists from "Holding" to "Customer" issued at "2025-01-15" totalling "100.00"
    And an on-behalf invoice exists numbered "FV-61" from "Holding" to "Customer" on behalf of "Studio" issued at "2025-02-15" totalling "50.00"
    When I request the dashboard summary
    Then the response status should be 200
    And the response should contain totalRevenue "150.00"
    And the response should contain invoiceCount 2
