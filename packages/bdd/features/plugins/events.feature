Feature: Plugin domain events

  A plugin lists the entity classes that should emit domain events via its
  primaryEntities contract field. The shared DomainEventSubscriber then publishes
  namespaced events of the form "marketlum.plugin.<id>.<entity_snake>.<verb>" for
  those entities, alongside the core events. The "example" plugin declares its
  "Widget" entity as a primary entity.

  Scenario: Creating a plugin entity publishes a namespaced created event
    Given I am authenticated as "admin@marketlum.com"
    When I create a widget through the example plugin with name "Eventful widget"
    Then the response status should be 201
    And the event "marketlum.plugin.example.widget.created" was published with the new entity's id

  Scenario: Updating a plugin entity publishes a namespaced updated event
    Given I am authenticated as "admin@marketlum.com"
    And a widget exists through the example plugin
    When I update the recorded widget's name
    Then the response status should be 200
    And the event "marketlum.plugin.example.widget.updated" was published with the entity's id

  Scenario: Deleting a plugin entity publishes a namespaced deleted event
    Given I am authenticated as "admin@marketlum.com"
    And a widget exists through the example plugin
    When I delete the recorded widget
    Then the response status should be 204
    And the event "marketlum.plugin.example.widget.deleted" was published with the entity's id
