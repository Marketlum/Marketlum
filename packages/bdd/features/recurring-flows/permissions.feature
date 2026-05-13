Feature: Recurring Flow Permissions

  Scenario: Authenticated user can create a recurring flow
    Given I am authenticated
    And a value stream "Sales" exists
    And an agent "Acme" exists
    When I create a recurring flow with stream "Sales", agent "Acme", direction "inbound", amount "5000", unit "USD", frequency "monthly", interval 1, startDate "2026-01-15"
    Then the response status should be 201

  Scenario: Unauthenticated request to create a recurring flow is rejected
    Given a value stream "Sales" exists
    And an agent "Acme" exists
    When I create a recurring flow without auth
    Then the response status should be 401

  Scenario: Unauthenticated request to list recurring flows is rejected
    When I list recurring flows without auth
    Then the response status should be 401
