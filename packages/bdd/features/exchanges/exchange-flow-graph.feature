Feature: Exchange Flow Graph Data

  The exchange flow graph visualizes exchange flows as an animated network graph
  where agents are nodes and flows are directed edges between them.
  This feature validates that the API returns all data needed for the visualization.

  Scenario: Flow response includes value type for color coding
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget" and type "product"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget" from "Seller Corp" to "Buyer Inc" with quantity "10.00"
    When I list flows for the exchange
    Then the response status should be 200
    And the response should contain 1 flow
    And each flow should include value with id, name, and type
    And each flow should include fromAgent with id, name, and type
    And each flow should include toAgent with id, name, and type

  Scenario: Flows for different value types return correct type info
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Provider"
    And an agent exists with name "Consumer"
    And a value exists with name "Product X" and type "product"
    And a value exists with name "Service Y" and type "service"
    And an exchange exists with name "Mixed Exchange"
    And a flow exists with value "Product X" from "Provider" to "Consumer" with quantity "5.00"
    And a flow exists with value "Service Y" from "Consumer" to "Provider" with quantity "1.00"
    When I list flows for the exchange
    Then the response status should be 200
    And the response should contain 2 flows
    And the flow for value "Product X" should have type "product"
    And the flow for value "Service Y" should have type "service"
