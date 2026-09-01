Feature: Rebuild Tension Projection

  The tensions table is a projection of the tension event streams (spec 027).
  Rebuilding replays every stream and reconciles the table in place — it never
  truncates, because exchanges reference tensions.

  Scenario: Dry run reports a projection already in sync
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    When I run the tension projection rebuild in dry-run mode
    Then the rebuild should report 1 stream replayed
    And the rebuild should report 0 rows changed

  Scenario: Rebuild repairs a drifted projection row
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the projection row for "Onboarding gap" has been corrupted
    When I run the tension projection rebuild
    Then the rebuild should report 1 row updated
    And the tension "Onboarding gap" should have score 5 and state "alive"

  Scenario: Rebuild keeps a discarded tension deleted
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And the tension "Onboarding gap" has been discarded
    When I run the tension projection rebuild
    Then the rebuild should report 0 rows updated
    And the tension "Onboarding gap" should not exist

  Scenario: Rebuild preserves exchange links to tensions
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Org A"
    And a tension exists with name "Onboarding gap"
    And an exchange exists linked to the tension "Onboarding gap"
    When I run the tension projection rebuild
    Then the exchange should still be linked to the tension "Onboarding gap"
