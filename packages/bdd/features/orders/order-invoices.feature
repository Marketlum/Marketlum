Feature: Order invoices

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a currency value exists with name "EUR"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"

  Scenario: Create an invoice linked to the order
    When I create an invoice with number "INV-100" in currency "USD" linked to the order
    Then the response status should be 201
    And the invoice response should reference the order

  Scenario: Link an existing invoice to the order
    Given an invoice exists with number "INV-101" in currency "USD"
    When I link the invoice "INV-101" to the order
    Then the response status should be 200
    And the invoice response should reference the order

  Scenario: Unlink an invoice from the order
    Given an invoice exists with number "INV-102" in currency "USD" linked to the order
    When I unlink the invoice "INV-102" from the order
    Then the response status should be 200
    And the invoice response should reference no order

  Scenario: Reject linking an invoice with a different currency
    Given an invoice exists with number "INV-103" in currency "EUR"
    When I link the invoice "INV-103" to the order
    Then the response status should be 409

  Scenario: Reject linking an invoice to a completed order
    Given the order is placed
    And the order is started
    And the order is completed
    And an invoice exists with number "INV-104" in currency "USD"
    When I link the invoice "INV-104" to the order
    Then the response status should be 409

  Scenario: List invoices of an order
    Given an invoice exists with number "INV-105" in currency "USD" linked to the order
    And an invoice exists with number "INV-106" in currency "USD"
    When I search invoices of the order
    Then the response status should be 200
    And the search result should contain 1 invoices

  Scenario: The order detail exposes the invoiced total
    Given an invoice exists with number "INV-107" in currency "USD" linked to the order with total "100.50"
    And an invoice exists with number "INV-108" in currency "USD" linked to the order with total "49.50"
    When I fetch the order
    Then the response status should be 200
    And the order invoiced total should be "150.00"

  Scenario: Deleting the order detaches its invoices
    Given an invoice exists with number "INV-109" in currency "USD" linked to the order
    When I delete the order
    And I fetch the invoice "INV-109"
    Then the response status should be 200
    And the invoice response should reference no order
