Feature: Order lifecycle

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"

  Scenario: Place a draft order
    When I place the order
    Then the response status should be 200
    And the response should contain an order with state "new"
    And the response should contain a placedAt timestamp

  Scenario: Start a new order
    Given the order is placed
    When I start the order
    Then the response status should be 200
    And the response should contain an order with state "processing"

  Scenario: Complete a processing order
    Given the order is placed
    And the order is started
    When I complete the order
    Then the response status should be 200
    And the response should contain an order with state "completed"
    And the response should contain a completedAt timestamp

  Scenario: Cancel a draft order
    When I cancel the order
    Then the response status should be 200
    And the response should contain an order with state "cancelled"
    And the response should contain a cancelledAt timestamp

  Scenario: Cancel a new order
    Given the order is placed
    When I cancel the order
    Then the response status should be 200
    And the response should contain an order with state "cancelled"

  Scenario: Cancel a processing order
    Given the order is placed
    And the order is started
    When I cancel the order
    Then the response status should be 200
    And the response should contain an order with state "cancelled"

  Scenario: Reject completing a draft order
    When I complete the order
    Then the response status should be 409

  Scenario: Reject placing an order twice
    Given the order is placed
    When I place the order
    Then the response status should be 409

  Scenario: Reject cancelling a completed order
    Given the order is placed
    And the order is started
    And the order is completed
    When I cancel the order
    Then the response status should be 409

  Scenario: Transitioning a non-existent order returns 404
    When I place the order with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
