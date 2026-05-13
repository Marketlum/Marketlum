Feature: Update Recurring Flow

  Scenario: Update the amount of a recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I update that recurring flow with amount "250"
    Then the response status should be 200
    And the response should contain a recurring flow with amount "250.0000" and unit "USD"

  Scenario: Update the description and frequency of a recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I update that recurring flow with description "Quarterly retainer" and frequency "quarterly"
    Then the response status should be 200
    And the response should contain a recurring flow with description "Quarterly retainer"

  Scenario: Updating a non-existent recurring flow returns 404
    Given I am authenticated
    When I update a random recurring flow with amount "999"
    Then the response status should be 404
