Feature: Update Exchange Flow

  Scenario: Update flow quantity
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget" from "Seller Corp" to "Buyer Inc" with quantity "10.00"
    When I update the flow's quantity to "20.00"
    Then the response status should be 200
    And the response should contain a flow with quantity "20.00"

  Scenario: Update flow agents (must be parties)
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget" from "Agent A" to "Agent B" with quantity "10.00"
    When I update the flow to swap from and to agents
    Then the response status should be 200
    And the response should contain a flow fromAgent "Agent B"
    And the response should contain a flow toAgent "Agent A"

  Scenario: Reject non-party agent on update
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an agent exists with name "Outsider"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget" from "Agent A" to "Agent B" with quantity "10.00"
    When I update the flow's fromAgent to "Outsider"
    Then the response status should be 400

  Scenario: Update a non-existent flow returns 404
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Trade Deal"
    When I update the flow with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the flow for exchange "00000000-0000-0000-0000-000000000000" with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
