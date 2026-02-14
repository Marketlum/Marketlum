Feature: Get Invoice

  Scenario: Get an existing invoice by ID
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I request the invoice by its ID
    Then the response status should be 200
    And the response should contain an invoice with number "INV-001"
    And the response should contain a fromAgent with name "Seller Corp"
    And the response should contain a toAgent with name "Buyer Inc"

  Scenario: Get invoice with items and computed total
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value exists with name "Widget A"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc" with items
    When I request the invoice by its ID
    Then the response status should be 200
    And the response should contain 2 items
    And the response total should be "350.00"

  Scenario: Get invoice with channel
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a channel exists with name "Online Store"
    And an invoice exists with number "INV-CH1" from "Seller Corp" to "Buyer Inc" with channel "Online Store"
    When I request the invoice by its ID
    Then the response status should be 200
    And the response should contain an invoice with number "INV-CH1"
    And the response should contain a channel with name "Online Store"

  Scenario: Get a non-existent invoice returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an invoice with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an invoice with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
