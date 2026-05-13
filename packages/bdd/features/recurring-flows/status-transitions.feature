Feature: Recurring Flow Status Transitions

  Scenario: Activate a draft recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I transition that recurring flow with action "activate"
    Then the response status should be 200
    And the response should contain a recurring flow with status "active"

  Scenario: Pause an active recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And I transition that recurring flow with action "activate"
    When I transition that recurring flow with action "pause"
    Then the response status should be 200
    And the response should contain a recurring flow with status "paused"

  Scenario: Resume a paused recurring flow
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And I transition that recurring flow with action "activate"
    And I transition that recurring flow with action "pause"
    When I transition that recurring flow with action "resume"
    Then the response status should be 200
    And the response should contain a recurring flow with status "active"

  Scenario: End an active recurring flow with explicit endDate
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And I transition that recurring flow with action "activate"
    When I transition that recurring flow with action "end" and endDate "2026-12-31"
    Then the response status should be 200
    And the response should contain a recurring flow with status "ended"
    And the response should contain a recurring flow with endDate "2026-12-31"

  Scenario: Reject illegal transition (resume a draft flow)
    Given I am authenticated
    And a recurring flow with amount "100" exists
    When I transition that recurring flow with action "resume"
    Then the response status should be 400

  Scenario: Reject illegal transition (activate an ended flow)
    Given I am authenticated
    And a recurring flow with amount "100" exists
    And I transition that recurring flow with action "activate"
    And I transition that recurring flow with action "end"
    When I transition that recurring flow with action "activate"
    Then the response status should be 400
