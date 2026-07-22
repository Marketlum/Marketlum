Feature: Order events

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"

  Scenario: Creating an order publishes marketlum.order.created and no item-level event
    When I create an order with one item from "Seller Corp" to "Buyer Inc" in currency "USD"
    Then the response status should be 201
    And the event "marketlum.order.created" was published with the entity's id
    And no event matching "marketlum.order_item.*" was published

  Scenario: Updating an order publishes marketlum.order.updated
    Given an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    When I update the order with a shipping address in "Berlin" and a billing address in "Munich"
    Then the response status should be 200
    And the event "marketlum.order.updated" was published with the entity's id

  Scenario: Placing an order publishes marketlum.order.updated
    Given an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    When I place the order
    Then the response status should be 200
    And the event "marketlum.order.updated" was published with the entity's id

  Scenario: Deleting an order publishes marketlum.order.deleted
    Given an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    When I delete the order
    Then the response status should be 204
    And the event "marketlum.order.deleted" was published with the entity's id
