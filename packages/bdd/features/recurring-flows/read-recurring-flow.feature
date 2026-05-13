Feature: Read Recurring Flow

  Scenario: Read an existing recurring flow
    Given I am authenticated
    And a recurring flow with amount "750" exists
    When I read that recurring flow by id
    Then the response status should be 200
    And the response should contain a recurring flow with amount "750.0000" and unit "USD"

  Scenario: Reading a non-existent recurring flow returns 404
    Given I am authenticated
    When I read a recurring flow by a random id
    Then the response status should be 404
