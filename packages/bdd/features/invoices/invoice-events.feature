Feature: Invoice events

  Scenario: Creating an invoice publishes marketlum.invoice.created and no item-level event
    Given I am authenticated as "admin@marketlum.com"
    When I create an invoice for the event recorder
    Then the response status should be 201
    And the event "marketlum.invoice.created" was published with the entity's id
    And no event matching "marketlum.invoice_item.*" was published

  Scenario: Updating an invoice publishes marketlum.invoice.updated
    Given I am authenticated as "admin@marketlum.com"
    And an invoice exists for the event recorder
    When I update the recorded invoice's number
    Then the response status should be 200
    And the event "marketlum.invoice.updated" was published with the entity's id

  Scenario: Deleting an invoice publishes marketlum.invoice.deleted
    Given I am authenticated as "admin@marketlum.com"
    And an invoice exists for the event recorder
    When I delete the recorded invoice
    Then the response status should be 204
    And the event "marketlum.invoice.deleted" was published with the entity's id
