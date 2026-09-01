Feature: Tension History

  GET /tensions/:id/history renders the event stream as a timeline (spec 027 §5.1).

  Scenario: History of a newly sensed tension holds its genesis event
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I request the history of the tension "Onboarding gap"
    Then the response status should be 200
    And the history should contain 1 entry
    And the history entry 1 should have type "TensionSensed"

  Scenario: Renaming appends an entry carrying the previous name
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the tension "Onboarding gap" has been renamed to "Supply risk"
    When I request the history of the tension "Supply risk"
    Then the response status should be 200
    And the history should contain 2 entries
    And the history entry 1 should have type "TensionRenamed"
    And the history entry 1 payload should have previousName "Onboarding gap"

  Scenario: Rescoring renders a human-readable summary
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the tension "Onboarding gap" has been rescored to 8
    When I request the history of the tension "Onboarding gap"
    Then the response status should be 200
    And the history entry 1 should have summary "Score raised from 5 to 8"
    And the history entry 1 should have summaryKey "history.rescored.raised"

  Scenario: History is ordered newest first
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the tension "Onboarding gap" has been rescored to 8
    And the tension "Onboarding gap" has been resolved
    When I request the history of the tension "Onboarding gap"
    Then the response status should be 200
    And the history should contain 3 entries
    And the history entry 1 should have version 3
    And the history entry 3 should have version 1

  Scenario: History is paginated
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the tension "Onboarding gap" has been rescored to 8
    And the tension "Onboarding gap" has been resolved
    When I request the history of the tension "Onboarding gap" with limit 2
    Then the response status should be 200
    And the history should contain 2 entries
    And the history meta total should be 3

  Scenario: History records the acting user
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I request the history of the tension "Onboarding gap"
    Then the response status should be 200
    And the history entry 1 actor kind should be "human"
    And the history entry 1 actor userName should be "Admin"

  Scenario: History of a non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request the history of the tension with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
