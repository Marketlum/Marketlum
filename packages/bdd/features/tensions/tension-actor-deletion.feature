Feature: Actor Deletion Discards Tensions

  Before spec 027 an ON DELETE CASCADE removed tensions silently when their
  actor was deleted, leaving no event — a rebuild would have resurrected them.
  The FK is now RESTRICT and deletion goes through DiscardTension commands.

  Scenario: Deleting an actor discards its tensions
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Doomed Org"
    And a tension exists with name "Owned Tension"
    When I delete the actor "Doomed Org"
    Then the response status should be 204
    And the tension "Owned Tension" should not exist

  Scenario: Discarded tensions keep a TensionDiscarded event in their stream
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Doomed Org"
    And a tension exists with name "Owned Tension"
    When I delete the actor "Doomed Org"
    Then the response status should be 204
    And the tension "Owned Tension" should have a TensionDiscarded event in its stream

  Scenario: A rebuild does not resurrect tensions discarded by actor deletion
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Doomed Org"
    And a tension exists with name "Owned Tension"
    And the actor "Doomed Org" has been deleted
    When I run the tension projection rebuild
    Then the tension "Owned Tension" should not exist
