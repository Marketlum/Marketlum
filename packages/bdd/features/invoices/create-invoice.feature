Feature: Create Invoice

  Scenario: Create invoice with all fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value stream exists with name "Main Stream"
    When I create an invoice with:
      | number   | issuedAt                 | dueAt                    | paid  | link                       |
      | INV-001  | 2025-01-15T00:00:00.000Z | 2025-02-15T00:00:00.000Z | false | https://example.com/inv001 |
    Then the response status should be 201
    And the response should contain an invoice with number "INV-001"
    And the response should contain a fromAgent with name "Seller Corp"
    And the response should contain a toAgent with name "Buyer Inc"
    And the response should contain a currency with name "USD"
    And the response should contain a valueStream with name "Main Stream"
    And the response should contain an invoice with paid false

  Scenario: Create invoice with items
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value exists with name "Widget A"
    And a value instance exists with name "Widget A Instance" for value "Widget A"
    When I create an invoice with items:
      | number   |
      | INV-002  |
    Then the response status should be 201
    And the response should contain an invoice with number "INV-002"
    And the response should contain 2 items
    And the response total should be "350.00"

  Scenario: Reject duplicate number for same fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I create a duplicate invoice with number "INV-001" from "Seller Corp"
    Then the response status should be 409

  Scenario: Allow same number for different fromAgents
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Other Seller"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I create an invoice with number "INV-001" from "Other Seller"
    Then the response status should be 201

  Scenario: Reject missing required fields
    Given I am authenticated as "admin@marketlum.com"
    When I create an invoice with empty body
    Then the response status should be 400

  Scenario: Reject non-existent fromAgentId
    Given I am authenticated as "admin@marketlum.com"
    When I create an invoice with non-existent fromAgentId
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create an invoice without authentication
    Then the response status should be 401
