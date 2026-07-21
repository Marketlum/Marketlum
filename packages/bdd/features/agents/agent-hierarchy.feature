Feature: Agent Hierarchy

  Agents form a closure-table forest: any agent may optionally have a parent
  agent, giving many independent trees of arbitrary depth. Any agent type may
  parent any type. Re-parenting happens only through the move endpoint, which
  rejects moves into the agent itself or its own subtree. An agent with
  sub-agents cannot be deleted until they are removed or moved away.

  Background:
    Given I am authenticated as "admin@marketlum.com"

  Scenario: Create an agent under a parent
    Given a root agent exists with name "Acme Holding" and type "organization"
    When I create an agent named "Acme Poland" of type "organization" under parent "Acme Holding"
    Then the response status should be 201
    And the agent response has parent "Acme Holding" and level 1

  Scenario: Create an agent under an unknown parent fails
    When I create an agent named "Orphan" of type "organization" under an unknown parent
    Then the response status should be 404

  Scenario: Get direct children of an agent
    Given a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an agent exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the children of the agent "Acme Holding"
    Then the response status should be 200
    And the agent list contains exactly "Acme Poland"

  Scenario: Get the full agent tree
    Given a root agent exists with name "Acme Holding" and type "organization"
    And a root agent exists with name "GreenLeaf Partners" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I request the agent tree
    Then the response status should be 200
    And the agent tree has a root "Acme Holding" with child "Acme Poland"
    And the agent tree has a root "GreenLeaf Partners" with no children

  Scenario: Get descendants of an agent
    Given a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an agent exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the descendants of the agent "Acme Holding"
    Then the response status should be 200
    And the agent list contains exactly "Acme Poland, Sarah Palmer"

  Scenario: Move an agent to a different parent
    Given a root agent exists with name "Acme Holding" and type "organization"
    And a root agent exists with name "TechNova Solutions" and type "organization"
    And an agent exists with name "Sarah Palmer" and type "individual" under parent "Acme Holding"
    When I move the agent "Sarah Palmer" under "TechNova Solutions"
    Then the response status should be 200
    And the agent response has parent "TechNova Solutions" and level 1
    And the descendants of "TechNova Solutions" contain exactly "Sarah Palmer"
    And the event "marketlum.agent.updated" was published with the entity's id

  Scenario: Move an agent to root
    Given a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I move the agent "Acme Poland" to root
    Then the response status should be 200
    And the agent response has no parent and level 0

  Scenario: Move to a non-existent parent fails
    Given a root agent exists with name "Acme Holding" and type "organization"
    When I move the agent "Acme Holding" under an unknown parent
    Then the response status should be 404

  Scenario: Move an agent into its own descendant fails
    Given a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an agent exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I move the agent "Acme Holding" under "Sarah Palmer"
    Then the response status should be 400

  Scenario: Move an agent into itself fails
    Given a root agent exists with name "Acme Holding" and type "organization"
    When I move the agent "Acme Holding" under "Acme Holding"
    Then the response status should be 400

  Scenario: Deleting an agent with sub-agents is rejected
    Given a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I delete the agent "Acme Holding"
    Then the response status should be 409
    When I move the agent "Acme Poland" to root
    And I delete the agent "Acme Holding"
    Then the response status should be 204
