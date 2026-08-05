Feature: Actor functional currency

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And a currency value exists named "EUR"

  Scenario: Creating an actor with a functional currency
    When I create an actor named "Acme GmbH" with functional currency "EUR"
    Then the response status should be 201
    And the actor functional currency should be "EUR"

  Scenario: Creating an actor without a functional currency is allowed
    When I create an actor named "Bare Actor" without a functional currency
    Then the response status should be 201
    And the actor functional currency should be null

  Scenario: Updating an actor's functional currency
    Given an actor exists named "Acme GmbH" with functional currency "USD"
    When I update that actor's functional currency to "EUR"
    Then the response status should be 200
    And the actor functional currency should be "EUR"

  Scenario: Clearing an actor's functional currency
    Given an actor exists named "Acme GmbH" with functional currency "USD"
    When I clear that actor's functional currency
    Then the response status should be 200
    And the actor functional currency should be null

  Scenario: Functional currency must reference a Value of type currency
    Given a product value exists named "Coffee"
    When I create an actor named "Wrong Type" with functional currency "Coffee"
    Then the response status should be 400

  Scenario: Snapshot references endpoint returns zero counts for an actor with no invoices
    Given an actor exists named "Lonely Actor" with functional currency "USD"
    When I fetch the snapshot references for "Lonely Actor"
    Then the response status should be 200
    And the snapshot references invoiceItems should be 0
