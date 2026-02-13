Feature: Get Exchange Flow

  Scenario: Get a flow by ID with relations
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    And a flow exists with value "Widget" from "Seller Corp" to "Buyer Inc" with quantity "10.00"
    When I request the flow by its ID
    Then the response status should be 200
    And the response should contain a flow with quantity "10.00"
    And the response should contain a flow with value "Widget"

  Scenario: Get a non-existent flow returns 404
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Trade Deal"
    When I request a flow with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a flow for exchange "00000000-0000-0000-0000-000000000000" with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
