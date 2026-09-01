Feature: Transition Tension

  Spec 027 replaced POST /tensions/:id/transitions with one endpoint per
  lifecycle command. Legality is enforced by the aggregate guards, which
  replaced the xstate machine for this aggregate.

  Scenario: Newly sensed tension is alive
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    When I create a tension with name "Onboarding gap" and actor "Org A"
    Then the response status should be 201
    And the response should contain a tension with state "alive"

  Scenario: Resolve an alive tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I resolve the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with state "resolved"
    And the response should contain a tension with version 2

  Scenario: Drop an alive tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I drop the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with state "stale"

  Scenario: Reopen a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I reopen the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with state "alive"

  Scenario: Revive a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I revive the tension "Onboarding gap"
    Then the response status should be 200
    And the response should contain a tension with state "alive"

  Scenario: Reject resolving a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I resolve the tension "Onboarding gap"
    Then the response status should be 400

  Scenario: Reject dropping a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I drop the tension "Onboarding gap"
    Then the response status should be 400

  Scenario: Reject reviving a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I revive the tension "Onboarding gap"
    Then the response status should be 400

  Scenario: Reject reopening a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I reopen the tension "Onboarding gap"
    Then the response status should be 400

  Scenario: Reject dropping a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I drop the tension "Onboarding gap"
    Then the response status should be 400

  Scenario: Transitioning a non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I resolve the tension with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated transition is rejected
    When I resolve the tension with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
