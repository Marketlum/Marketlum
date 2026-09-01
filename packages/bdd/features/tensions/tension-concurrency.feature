Feature: Tension Concurrency

  The event store enforces optimistic concurrency through
  UQ_domain_events_stream_version (spec 027 Q5): two writers cannot occupy the
  same stream version, and the loser gets a 409.

  Scenario: Appending at an already-used version is rejected
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I append an event to the tension "Onboarding gap" at a stale version
    Then the append should be rejected as a conflict

  Scenario: Concurrent amendments never produce duplicate versions
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rescore the tension "Onboarding gap" 8 times concurrently
    Then every response should be either 200 or 409
    And the tension stream should have no duplicate versions
    And the tension version should equal the number of successful rescores plus 1

  Scenario: Sequential amendments increment the version
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I rescore the tension "Onboarding gap" to 6
    And I rescore the tension "Onboarding gap" to 7
    And I rescore the tension "Onboarding gap" to 8
    Then the response should contain a tension with version 4
