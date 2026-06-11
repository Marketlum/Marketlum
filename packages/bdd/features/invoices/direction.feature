Feature: Invoice direction

  Every invoice carries an explicit direction (revenue or expense) that drives
  value-stream financials. Direction is required on create.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"

  Scenario: Create a revenue invoice
    When I create an invoice with number "INV-REV" and direction "revenue"
    Then the response status should be 201
    And the response invoice direction should be "revenue"

  Scenario: Create an expense invoice
    When I create an invoice with number "INV-EXP" and direction "expense"
    Then the response status should be 201
    And the response invoice direction should be "expense"

  Scenario: Reject creating an invoice without a direction
    When I create an invoice with number "INV-NODIR" and no direction
    Then the response status should be 400

  Scenario: Update an invoice's direction
    Given an invoice exists with number "INV-UPD" and direction "revenue"
    When I update the invoice's direction to "expense"
    Then the response status should be 200
    And the response invoice direction should be "expense"

  Scenario: Filter invoices by direction
    Given an invoice exists with number "INV-R1" and direction "revenue"
    And an invoice exists with number "INV-E1" and direction "expense"
    And an invoice exists with number "INV-E2" and direction "expense"
    When I search invoices with direction "expense"
    Then the response status should be 200
    And the total count should be 2
