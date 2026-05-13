Feature: Delete Recurring Flow

  Scenario: Delete a draft recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I delete that recurring flow
    Then the response status should be 204

  Scenario: Reject deletion of an active recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And I transition that recurring flow with action "activate"
    When I delete that recurring flow
    Then the response status should be 409

  Scenario: Deleting a non-existent recurring flow returns 404
    Given I am authenticated
    When I delete a random recurring flow
    Then the response status should be 404
