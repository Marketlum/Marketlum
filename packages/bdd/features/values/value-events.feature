Feature: Value events

  Scenario: Creating a value publishes marketlum.value.created
    Given I am authenticated as "admin@marketlum.com"
    When I create a value for the event recorder
    Then the response status should be 201
    And the event "marketlum.value.created" was published with the new entity's id and code

  Scenario: Updating a value publishes marketlum.value.updated
    Given I am authenticated as "admin@marketlum.com"
    And a value exists for the event recorder
    When I update the recorded value's name
    Then the response status should be 200
    And the event "marketlum.value.updated" was published with the entity's id

  Scenario: Deleting a value publishes marketlum.value.deleted
    Given I am authenticated as "admin@marketlum.com"
    And a value exists for the event recorder
    When I delete the recorded value
    Then the response status should be 204
    And the event "marketlum.value.deleted" was published with the entity's id
