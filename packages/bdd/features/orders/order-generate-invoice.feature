Feature: Generate an invoice from an order

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a value exists with name "Widget A"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"

  Scenario: Generate an invoice copying the order's header and items
    Given the order has items:
      | value    | valueInstance | quantity | unitPrice |
      | Widget A |               | 2        | 100.00    |
      |          |               | 3        | 50.00     |
    When I generate an invoice for the order
    Then the response status should be 201
    And the invoice response should reference the order
    And the generated invoice number is the order number suffixed with "/1"
    And the response should contain a fromAgent with name "Seller Corp"
    And the response should contain a toAgent with name "Buyer Inc"
    And the response should contain a currency with name "USD"
    And the response should contain 2 items
    And the invoice total should be "350.00"

  Scenario: Generating again increments the invoice number suffix
    Given an invoice has been generated for the order
    When I generate an invoice for the order
    Then the response status should be 201
    And the generated invoice number is the order number suffixed with "/2"

  Scenario: Generating for an order without items yields an empty invoice
    When I generate an invoice for the order
    Then the response status should be 201
    And the response should contain 0 items
    And the invoice total should be "0.00"

  Scenario: Generating for a completed order is rejected
    Given the order is placed
    And the order is started
    And the order is completed
    When I generate an invoice for the order
    Then the response status should be 409

  Scenario: Generating for a cancelled order is rejected
    Given the order is cancelled
    When I generate an invoice for the order
    Then the response status should be 409

  Scenario: Generating for a non-existent order returns 404
    When I generate an invoice for the order with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Generating an invoice publishes marketlum.invoice.created
    When I generate an invoice for the order
    Then the response status should be 201
    And the event "marketlum.invoice.created" was published with the entity's id
