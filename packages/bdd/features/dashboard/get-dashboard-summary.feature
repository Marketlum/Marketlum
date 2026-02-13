Feature: Get dashboard summary

  Scenario: Authenticated user gets dashboard summary with no filters
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-01-15" with items totalling "100.00"
    And an invoice exists from "Buyer Inc" to "Seller Corp" issued at "2025-02-10" with items totalling "250.00"
    When I request the dashboard summary
    Then the response status should be 200
    And the response should contain totalRevenue "350.00"
    And the response should contain totalExpenses "0.00"
    And the response should contain invoiceCount 2
    And the timeSeries should have 2 entries

  Scenario: Filter by agentId returns revenue and expense split
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-01-15" with items totalling "100.00"
    And an invoice exists from "Buyer Inc" to "Seller Corp" issued at "2025-02-10" with items totalling "250.00"
    When I request the dashboard summary with agentId for "Seller Corp"
    Then the response status should be 200
    And the response should contain totalRevenue "100.00"
    And the response should contain totalExpenses "250.00"
    And the response should contain invoiceCount 2

  Scenario: Filter by valueStreamId scopes to invoices in that stream
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value stream exists with name "Stream A"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-01-15" with items totalling "100.00" in stream "Stream A"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-02-10" with items totalling "200.00"
    When I request the dashboard summary with valueStreamId for "Stream A"
    Then the response status should be 200
    And the response should contain totalRevenue "100.00"
    And the response should contain invoiceCount 1

  Scenario: Filter by date range scopes to issuedAt within range
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-01-15" with items totalling "100.00"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-03-20" with items totalling "300.00"
    When I request the dashboard summary with fromDate "2025-03-01" and toDate "2025-03-31"
    Then the response status should be 200
    And the response should contain totalRevenue "300.00"
    And the response should contain invoiceCount 1

  Scenario: Combined filters with agent and value stream and dates
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value stream exists with name "Stream A"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-01-15" with items totalling "100.00" in stream "Stream A"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-02-10" with items totalling "200.00" in stream "Stream A"
    And an invoice exists from "Buyer Inc" to "Seller Corp" issued at "2025-01-20" with items totalling "50.00" in stream "Stream A"
    And an invoice exists from "Seller Corp" to "Buyer Inc" issued at "2025-03-05" with items totalling "400.00"
    When I request the dashboard summary with agentId for "Seller Corp" and valueStreamId for "Stream A" and fromDate "2025-01-01" and toDate "2025-01-31"
    Then the response status should be 200
    And the response should contain totalRevenue "100.00"
    And the response should contain totalExpenses "50.00"
    And the response should contain invoiceCount 2

  Scenario: Unauthenticated request returns 401
    When I request the dashboard summary without authentication
    Then the response status should be 401
