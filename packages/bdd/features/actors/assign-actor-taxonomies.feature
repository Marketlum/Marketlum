Feature: Assign Taxonomies to Agents

  Scenario: Create agent with main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create an agent with main taxonomy "Electronics" and:
      | name      | type         | purpose         |
      | Agent One | organization | Sells electronics |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"

  Scenario: Create agent with general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    When I create an agent with general taxonomies "Electronics,Software" and:
      | name      | type         | purpose       |
      | Agent Two | organization | Multi-category |
    Then the response status should be 201
    And the response should include general taxonomies "Electronics,Software"

  Scenario: Create agent with both main and general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    When I create an agent with main taxonomy "Electronics" and general taxonomies "Software,Hardware" and:
      | name        | type         | purpose      |
      | Agent Three | organization | Full taxonomy |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Create agent with non-existent main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent with a non-existent main taxonomy and:
      | name       | type         | purpose |
      | Agent Four | organization | Test    |
    Then the response status should be 404

  Scenario: Create agent with non-existent general taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create an agent with a non-existent general taxonomy and existing "Electronics" and:
      | name       | type         | purpose |
      | Agent Five | organization | Test    |
    Then the response status should be 404

  Scenario: Update agent's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And an agent exists with name "Agent Six" and type "organization"
    When I update the agent's main taxonomy to "Software"
    Then the response status should be 200
    And the response should include main taxonomy "Software"

  Scenario: Remove agent's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an agent exists with name "Agent Seven" and type "organization" and main taxonomy "Electronics"
    When I update the agent's main taxonomy to null
    Then the response status should be 200
    And the response should have null main taxonomy

  Scenario: Update agent's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    And an agent exists with name "Agent Eight" and type "organization" and general taxonomies "Electronics"
    When I update the agent's general taxonomies to "Software,Hardware"
    Then the response status should be 200
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Clear agent's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an agent exists with name "Agent Nine" and type "organization" and general taxonomies "Electronics"
    When I update the agent's general taxonomies to empty
    Then the response status should be 200
    And the response should have empty general taxonomies

  Scenario: Get agent by ID includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And an agent exists with name "Agent Ten" and type "organization" and main taxonomy "Electronics" and general taxonomies "Software"
    When I request the agent by their ID
    Then the response status should be 200
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software"

  Scenario: List agents includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an agent exists with name "Agent Eleven" and type "organization" and main taxonomy "Electronics"
    When I request the list of agents
    Then the response status should be 200
    And the first agent in the list should include main taxonomy "Electronics"

  Scenario: Unauthenticated request is rejected
    When I create an agent with:
      | name       | type         | purpose           |
      | Agent One  | organization | An organization agent |
    Then the response status should be 401
