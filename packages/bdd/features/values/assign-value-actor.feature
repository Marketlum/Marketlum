Feature: Assign Agent to Values

  Scenario: Create value with agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent Alpha" and type "organization"
    When I create a value with agent "Agent Alpha" and:
      | name      | type    | purpose        |
      | Value One | product | Has an agent   |
    Then the response status should be 201
    And the response should include agent "Agent Alpha"

  Scenario: Create value with non-existent agent
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent agent and:
      | name      | type    | purpose        |
      | Value Two | product | Bad agent ref  |
    Then the response status should be 404

  Scenario: Update value's agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent Alpha" and type "organization"
    And an agent exists with name "Agent Beta" and type "individual"
    And a value exists with name "Value Three" and type "product" and agent "Agent Alpha"
    When I update the value's agent to "Agent Beta"
    Then the response status should be 200
    And the response should include agent "Agent Beta"

  Scenario: Remove value's agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent Alpha" and type "organization"
    And a value exists with name "Value Four" and type "product" and agent "Agent Alpha"
    When I update the value's agent to null
    Then the response status should be 200
    And the response should have null agent

  Scenario: Get value by ID includes agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent Alpha" and type "organization"
    And a value exists with name "Value Five" and type "product" and agent "Agent Alpha"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include agent "Agent Alpha"

  Scenario: List values includes agent data
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent Alpha" and type "organization"
    And a value exists with name "Value Six" and type "product" and agent "Agent Alpha"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include agent "Agent Alpha"

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
