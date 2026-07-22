Feature: Search Orders

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And an agent exists with name "Partner Ltd"
    And a currency value exists with name "USD"
    And a pipeline exists with name "Direct Sales"
    And an order exists from "Seller Corp" to "Buyer Inc" in currency "USD"
    And an order exists from "Buyer Inc" to "Partner Ltd" in currency "USD" with pipeline "Direct Sales"

  Scenario: List all orders
    When I search orders
    Then the response status should be 200
    And the search result should contain 2 orders

  Scenario: Filter orders by state
    Given the last order is placed
    When I search orders with state "new"
    Then the response status should be 200
    And the search result should contain 1 orders

  Scenario: Filter orders by fromAgent
    When I search orders with fromAgent "Seller Corp"
    Then the response status should be 200
    And the search result should contain 1 orders

  Scenario: Filter orders by agent on either side
    When I search orders involving agent "Buyer Inc"
    Then the response status should be 200
    And the search result should contain 2 orders

  Scenario: Filter orders by pipeline
    When I search orders with pipeline "Direct Sales"
    Then the response status should be 200
    And the search result should contain 1 orders

  Scenario: Search orders by number
    When I search orders by the first order's number
    Then the response status should be 200
    And the search result should contain 1 orders

  Scenario: Paginate orders
    When I search orders with page 2 and limit 1
    Then the response status should be 200
    And the search result should contain 1 orders
    And the search meta should report a total of 2
