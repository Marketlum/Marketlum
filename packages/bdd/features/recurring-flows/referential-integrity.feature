Feature: Recurring Flow Referential Integrity

  Scenario: Deleting an agent with a recurring flow attached is restricted
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I delete the counterparty agent of that recurring flow
    Then the response status should not be 204

  Scenario: Deleting a value referenced by a recurring flow nullifies the link
    Given I am authenticated
    And a recurring flow with amount "100" linked to a value exists
    When I delete the referenced value
    And I read that recurring flow by id
    Then the response status should be 200
    And the response should contain a recurring flow with a null value link

  Scenario: Deleting a value stream with a recurring flow attached is restricted
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I delete the value stream of that recurring flow
    Then the response status should not be 204
