Feature: Create Exchange Flow

  Scenario: Create flow with value reference
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    When I create a flow with value "Widget" from "Seller Corp" to "Buyer Inc" with quantity "10.00"
    Then the response status should be 201
    And the response should contain a flow with quantity "10.00"
    And the response should contain a flow with value "Widget"
    And the response should contain a flow fromAgent "Seller Corp"
    And the response should contain a flow toAgent "Buyer Inc"

  Scenario: Create flow with valueInstance reference
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "Widget"
    And a value instance exists with name "Widget #1" for value "Widget"
    And an exchange exists with name "Trade Deal"
    When I create a flow with valueInstance "Widget #1" from "Seller Corp" to "Buyer Inc" with quantity "1.00"
    Then the response status should be 201
    And the response should contain a flow with quantity "1.00"
    And the response should contain a flow with valueInstance "Widget #1"

  Scenario: Reject non-party fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an agent exists with name "Outsider"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    When I create a flow with value "Widget" from "Outsider" to "Agent B" with quantity "5.00"
    Then the response status should be 400

  Scenario: Reject non-party toAgent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an agent exists with name "Outsider"
    And a value exists with name "Widget"
    And an exchange exists with name "Trade Deal"
    When I create a flow with value "Widget" from "Agent A" to "Outsider" with quantity "5.00"
    Then the response status should be 400

  Scenario: Reject flow with both value and valueInstance
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a value exists with name "Widget"
    And a value instance exists with name "Widget #1" for value "Widget"
    And an exchange exists with name "Trade Deal"
    When I create a flow with both value and valueInstance
    Then the response status should be 400

  Scenario: Reject flow with neither value nor valueInstance
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Trade Deal"
    When I create a flow with neither value nor valueInstance
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a flow for exchange "00000000-0000-0000-0000-000000000000" without authentication
    Then the response status should be 401
