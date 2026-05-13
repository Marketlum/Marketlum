Feature: Value stream budget

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And the system base value is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2"
    And a value stream exists named "Platform"

  Scenario: Empty stream returns zero totals
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget activeFlowCount should be 0
    And the budget annual revenue should be "0.00"
    And the budget annual expense should be "0.00"

  Scenario: Inactive flows are excluded
    Given a draft recurring flow exists on "Platform" with value "USD" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget activeFlowCount should be 0
    And the budget annual revenue should be "0.00"

  Scenario: Active monthly inbound flow contributes for every month in range
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "12000.00"
    And the budget monthly revenue should be "1000.00"
    And the budget quarterly revenue should be "3000.00"

  Scenario: startDate clips contribution
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-07-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "6000.00"

  Scenario: endDate clips contribution
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01" ending "2026-06-30"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "6000.00"

  Scenario: Direct-only excludes descendant flows
    Given a child value stream "Frontend" exists under "Platform"
    And an active recurring flow exists on "Frontend" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026 with directOnly true
    Then the response status should be 200
    And the budget annual revenue should be "0.00"

  Scenario: Subtree mode includes descendant flows
    Given a child value stream "Frontend" exists under "Platform"
    And an active recurring flow exists on "Frontend" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "12000.00"

  Scenario: Year selector picks correct months
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2025-01-01" ending "2025-12-31"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "0.00"

  Scenario: Monthly and quarterly are consistent with annual
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget monthly should equal annual divided by 12
    And the budget quarterly should equal annual divided by 4

  Scenario: Missing baseAmount snapshots increment skippedFlows
    Given a value exists named "GBP"
    And an active recurring flow exists on "Platform" with value "GBP" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget skippedFlows should be 1
    And the budget annual revenue should be "0.00"

  Scenario: Multi-currency flows convert via baseAmount snapshot
    Given an active recurring flow exists on "Platform" with value "USD" direction "inbound" amount "1000" frequency "monthly" starting "2026-01-01"
    And an active recurring flow exists on "Platform" with value "EUR" direction "outbound" amount "200" frequency "monthly" starting "2026-01-01"
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget annual revenue should be "12000.00"
    And the budget annual expense should be "1200.00"
    And the budget annual net should be "10800.00"

  Scenario: Missing base value returns null totals
    Given the system base value is cleared
    When I request the budget for "Platform" for year 2026
    Then the response status should be 200
    And the budget baseValue should be null
    And the budget annual revenue should be null

  Scenario: Unauthenticated user cannot fetch the budget
    When I request the budget for "Platform" for year 2026 without authentication
    Then the response status should be 401
