Feature: Order items

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a value exists with name "Widget A"
    And a value instance exists with name "Widget A Instance" for value "Widget A"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"

  Scenario: Add items to a draft order
    When I update the order with items:
      | value    | valueInstance     | quantity | unitPrice |
      | Widget A | Widget A Instance | 2        | 100.00    |
      |          |                   | 3        | 50.00     |
    Then the response status should be 200
    And the response should contain 2 items
    And the order item 1 total should be "200.00"
    And the order item 2 total should be "150.00"
    And the order total should be "350.00"
    And the order item 1 should reference value "Widget A" and instance "Widget A Instance"

  Scenario: Replacing items discards the previous ones
    Given the order has items:
      | value    | valueInstance | quantity | unitPrice |
      | Widget A |               | 2        | 100.00    |
    When I update the order with items:
      |  value | valueInstance | quantity | unitPrice |
      |        |               | 1        | 25.00     |
    Then the response status should be 200
    And the response should contain 1 items
    And the order total should be "25.00"

  Scenario: Reject an item referencing an unknown value
    When I update the order with an item referencing a non-existent value
    Then the response status should be 404

  Scenario: Reject replacing items once the order is placed
    Given the order is placed
    When I update the order with items:
      | value    | valueInstance | quantity | unitPrice |
      | Widget A |               | 2        | 100.00    |
    Then the response status should be 409
