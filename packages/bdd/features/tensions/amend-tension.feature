Feature: Amend Tension

  Spec 027 replaced PATCH /tensions/:id with one endpoint per command. Each
  amendment appends exactly one intent-carrying event; a command that would
  change nothing is a no-op and appends none.

  Scenario: Rename a tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rename the tension "Onboarding gap" to "Supply risk"
    Then the response status should be 200
    And the response should contain a tension with name "Supply risk"
    And the response should contain a tension with version 2

  Scenario: Renaming to the same name is a no-op
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rename the tension "Onboarding gap" to "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with version 1

  Scenario: Rename with an empty name fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rename the tension "Onboarding gap" to ""
    Then the response status should be 400

  Scenario: Rescore a tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rescore the tension "Onboarding gap" to 8
    Then the response status should be 200
    And the response should contain a tension with score 8
    And the response should contain a tension with version 2

  Scenario: Rescoring to the same score is a no-op
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rescore the tension "Onboarding gap" to 5
    Then the response status should be 200
    And the response should contain a tension with version 1

  Scenario: Rescore outside the allowed range fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rescore the tension "Onboarding gap" to 11
    Then the response status should be 400

  Scenario: Revise both context fields
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I revise the tension "Onboarding gap" with currentContext "Half automated" and potentialFuture "Fully automated"
    Then the response status should be 200
    And the response should contain a tension with currentContext "Half automated"
    And the response should contain a tension with potentialFuture "Fully automated"

  Scenario: Revising only currentContext leaves potentialFuture untouched
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and potentialFuture "Original future"
    When I revise the tension "Onboarding gap" with currentContext "Only this changed"
    Then the response status should be 200
    And the response should contain a tension with currentContext "Only this changed"
    And the response should contain a tension with potentialFuture "Original future"

  Scenario: Revising with neither field fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I revise the tension "Onboarding gap" with no fields
    Then the response status should be 400

  Scenario: Assign a lead
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a user exists with name "Jane Lead"
    And a tension exists with name "Onboarding gap"
    When I assign the lead "Jane Lead" to the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a lead with name "Jane Lead"

  Scenario: Unassign the lead
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a user exists with name "Jane Lead"
    And a tension exists with name "Onboarding gap" led by "Jane Lead"
    When I unassign the lead from the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with no lead

  Scenario: Assigning a non-existent lead fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I assign a non-existent lead to the tension "Onboarding gap"
    Then the response status should be 404

  Scenario: Reassign a tension to another actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And an actor exists with name "Org B"
    And a tension exists with name "Onboarding gap"
    When I reassign the tension "Onboarding gap" to the actor "Org B"
    Then the response status should be 200
    And the response should contain an actor with name "Org B"

  Scenario: Reassigning to a non-existent actor fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I reassign the tension "Onboarding gap" to a non-existent actor
    Then the response status should be 404

  Scenario: Amending a non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I rename the tension with ID "00000000-0000-0000-0000-000000000000" to "Nope"
    Then the response status should be 404

  Scenario: Unauthenticated amendment is rejected
    When I rename the tension with ID "00000000-0000-0000-0000-000000000000" to "Nope"
    Then the response status should be 401
