Feature: Update Invoice

  Scenario: Update invoice scalar fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I update the invoice's number to "INV-999"
    Then the response status should be 200
    And the response should contain an invoice with number "INV-999"

  Scenario: Update invoice paid status
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I update the invoice's paid to true
    Then the response status should be 200
    And the response should contain an invoice with paid true

  Scenario: Replace invoice items on update
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value exists with name "Widget A"
    And a value exists with name "Widget B"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc" with items
    When I replace the invoice items with new values
    Then the response status should be 200
    And the response should contain 1 items
    And the response total should be "500.00"

  Scenario: Reject duplicate number for same fromAgent on update
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    When I update the second invoice's number to "INV-001"
    Then the response status should be 409

  Scenario: Update a non-existent invoice returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the invoice with ID "00000000-0000-0000-0000-000000000000" with number "INV-999"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the invoice with ID "00000000-0000-0000-0000-000000000000" with number "INV-999"
    Then the response status should be 401
