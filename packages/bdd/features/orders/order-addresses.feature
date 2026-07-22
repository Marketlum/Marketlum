Feature: Order addresses

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"

  Scenario: Set shipping and billing addresses on a draft order
    When I update the order with a shipping address in "Berlin" and a billing address in "Munich"
    Then the response status should be 200
    And the order shipping address city should be "Berlin"
    And the order billing address city should be "Munich"

  Scenario: Clear the shipping address
    Given the order has a shipping address in "Berlin"
    When I update the order with a null shipping address
    Then the response status should be 200
    And the order shipping address should be empty

  Scenario: Reject an incomplete address
    When I update the order with a shipping address missing the city
    Then the response status should be 400

  Scenario: Reject address changes once the order is placed
    Given the order is placed
    When I update the order with a shipping address in "Berlin" and a billing address in "Munich"
    Then the response status should be 409
