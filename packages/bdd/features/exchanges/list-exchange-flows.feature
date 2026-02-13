Feature: List Exchange Flows

  Scenario: List all flows for an exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget A"
    And a value exists with name "Widget B"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget A" from "Seller Corp" to "Buyer Inc" with quantity "10.00"
    And a flow exists with value "Widget B" from "Buyer Inc" to "Seller Corp" with quantity "5.00"
    When I list flows for the exchange
    Then the response status should be 200
    And the response should contain 2 flows

  Scenario: Empty array for exchange with no flows
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Empty Exchange"
    When I list flows for the exchange
    Then the response status should be 200
    And the response should contain 0 flows
