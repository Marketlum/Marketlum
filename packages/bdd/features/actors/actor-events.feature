Feature: Agent events

  Scenario: Creating an agent publishes marketlum.agent.created
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent for the event recorder
    Then the response status should be 201
    And the event "marketlum.agent.created" was published with the entity's id

  Scenario: Updating an agent publishes marketlum.agent.updated
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists for the event recorder
    When I update the recorded agent's name
    Then the response status should be 200
    And the event "marketlum.agent.updated" was published with the entity's id

  Scenario: Deleting an agent publishes marketlum.agent.deleted
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists for the event recorder
    When I delete the recorded agent
    Then the response status should be 204
    And the event "marketlum.agent.deleted" was published with the entity's id
