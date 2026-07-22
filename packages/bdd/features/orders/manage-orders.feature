Feature: Manage Orders

  Scenario: Create a draft order with required references
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    When I create an order from "Seller Corp" to "Buyer Inc" in currency "USD"
    Then the response status should be 201
    And the response should contain an order with state "draft"
    And the order number matches the order number format
    And the response should contain a fromAgent with name "Seller Corp"
    And the response should contain a toAgent with name "Buyer Inc"
    And the response should contain a currency with name "USD"

  Scenario: Order numbers are generated and unique
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    When I create an order from "Seller Corp" to "Buyer Inc" in currency "USD"
    And I create another order from "Seller Corp" to "Buyer Inc" in currency "USD"
    Then the response status should be 201
    And the two order numbers are distinct and match the order number format

  Scenario: Create an order with channel, pipeline and locale
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a channel exists with name "Online Store"
    And a pipeline exists with name "Direct Sales"
    And a locale exists with code "en"
    When I create an order with channel "Online Store", pipeline "Direct Sales" and locale "en"
    Then the response status should be 201
    And the response should contain a channel with name "Online Store"
    And the response should contain a pipeline with name "Direct Sales"
    And the response should contain a locale with code "en"

  Scenario: Reject an unknown fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    When I create an order with a non-existent fromAgent
    Then the response status should be 404

  Scenario: Reject a non-currency value as the order currency
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget A"
    When I create an order from "Seller Corp" to "Buyer Inc" in currency "Widget A"
    Then the response status should be 400

  Scenario: Reject an empty body
    Given I am authenticated as "admin@marketlum.com"
    When I create an order with an empty body
    Then the response status should be 400

  Scenario: Update a draft order
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a channel exists with name "Online Store"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    When I update the order with channel "Online Store"
    Then the response status should be 200
    And the response should contain a channel with name "Online Store"

  Scenario: Reject updating a placed order
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And a channel exists with name "Online Store"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    And the order is placed
    When I update the order with channel "Online Store"
    Then the response status should be 409

  Scenario: Delete a draft order
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    When I delete the order
    Then the response status should be 204

  Scenario: Reject deleting a placed order
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    And the order is placed
    When I delete the order
    Then the response status should be 409

  Scenario: Delete a cancelled order
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a currency value exists with name "USD"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    And the order is cancelled
    When I delete the order
    Then the response status should be 204

  Scenario: Unauthenticated request is rejected
    When I create an order without authentication
    Then the response status should be 401
