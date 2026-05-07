Feature: Transition Tension

  Scenario: Newly created tension is alive
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    When I create a tension with name "Onboarding gap" and agent "Org A"
    Then the response status should be 201
    And the response should contain a tension with state "alive"

  Scenario: Resolve an alive tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I transition the tension with action "resolve"
    Then the response status should be 200
    And the response should contain a tension with state "resolved"

  Scenario: Drop an alive tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I transition the tension with action "drop"
    Then the response status should be 200
    And the response should contain a tension with state "stale"

  Scenario: Reopen a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I transition the tension with action "reopen"
    Then the response status should be 200
    And the response should contain a tension with state "alive"

  Scenario: Revive a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I transition the tension with action "revive"
    Then the response status should be 200
    And the response should contain a tension with state "alive"

  Scenario: Reject resolving a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I transition the tension with action "resolve"
    Then the response status should be 400

  Scenario: Reject dropping a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I transition the tension with action "drop"
    Then the response status should be 400

  Scenario: Reject revive on a resolved tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I transition the tension with action "revive"
    Then the response status should be 400

  Scenario: Reject reopen on a stale tension
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "stale"
    When I transition the tension with action "reopen"
    Then the response status should be 400

  Scenario: Reject resolve directly to stale via drop while resolved
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Org A"
    And a tension exists with name "Onboarding gap" and state "resolved"
    When I transition the tension with action "drop"
    Then the response status should be 400

  Scenario: Non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I transition the tension with ID "00000000-0000-0000-0000-000000000000" with action "resolve"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I transition the tension with ID "00000000-0000-0000-0000-000000000000" with action "resolve"
    Then the response status should be 401
