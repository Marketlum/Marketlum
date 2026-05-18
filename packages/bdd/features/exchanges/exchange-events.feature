Feature: Exchange events

  Scenario: Creating an exchange publishes marketlum.exchange.created
    Given I am authenticated as "admin@marketlum.com"
    When I create an exchange for the event recorder
    Then the response status should be 201
    And the event "marketlum.exchange.created" was published with the entity's id
    And no event matching "marketlum.exchange_party.*" was published

  Scenario: Updating an exchange publishes marketlum.exchange.updated
    Given I am authenticated as "admin@marketlum.com"
    And an exchange exists for the event recorder
    When I update the recorded exchange's name
    Then the response status should be 200
    And the event "marketlum.exchange.updated" was published with the entity's id

  Scenario: Deleting an exchange publishes marketlum.exchange.deleted
    Given I am authenticated as "admin@marketlum.com"
    And an exchange exists for the event recorder
    When I delete the recorded exchange
    Then the response status should be 204
    And the event "marketlum.exchange.deleted" was published with the entity's id
