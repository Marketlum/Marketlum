Feature: Agent functional currency

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And a currency value exists named "EUR"

  Scenario: Creating an agent with a functional currency
    When I create an agent named "Acme GmbH" with functional currency "EUR"
    Then the response status should be 201
    And the agent functional currency should be "EUR"

  Scenario: Creating an agent without a functional currency is allowed
    When I create an agent named "Bare Agent" without a functional currency
    Then the response status should be 201
    And the agent functional currency should be null

  Scenario: Updating an agent's functional currency
    Given an agent exists named "Acme GmbH" with functional currency "USD"
    When I update that agent's functional currency to "EUR"
    Then the response status should be 200
    And the agent functional currency should be "EUR"

  Scenario: Clearing an agent's functional currency
    Given an agent exists named "Acme GmbH" with functional currency "USD"
    When I clear that agent's functional currency
    Then the response status should be 200
    And the agent functional currency should be null

  Scenario: Functional currency must reference a Value of type currency
    Given a product value exists named "Coffee"
    When I create an agent named "Wrong Type" with functional currency "Coffee"
    Then the response status should be 400

  Scenario: Snapshot references endpoint returns zero counts for an agent with no invoices
    Given an agent exists named "Lonely Agent" with functional currency "USD"
    When I fetch the snapshot references for "Lonely Agent"
    Then the response status should be 200
    And the snapshot references invoiceItems should be 0
