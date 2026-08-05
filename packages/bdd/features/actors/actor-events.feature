Feature: Actor events

  Scenario: Creating an actor publishes marketlum.actor.created
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor for the event recorder
    Then the response status should be 201
    And the event "marketlum.actor.created" was published with the entity's id

  Scenario: Updating an actor publishes marketlum.actor.updated
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists for the event recorder
    When I update the recorded actor's name
    Then the response status should be 200
    And the event "marketlum.actor.updated" was published with the entity's id

  Scenario: Deleting an actor publishes marketlum.actor.deleted
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists for the event recorder
    When I delete the recorded actor
    Then the response status should be 204
    And the event "marketlum.actor.deleted" was published with the entity's id
