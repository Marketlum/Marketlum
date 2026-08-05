Feature: Actor Hierarchy

  Actors form a closure-table forest: any actor may optionally have a parent
  actor, giving many independent trees of arbitrary depth. Any actor type may
  parent any type. Re-parenting happens only through the move endpoint, which
  rejects moves into the actor itself or its own subtree. An actor with
  sub-actors cannot be deleted until they are removed or moved away.

  Background:
    Given I am authenticated as "admin@marketlum.com"

  Scenario: Create an actor under a parent
    Given a root actor exists with name "Acme Holding" and type "organization"
    When I create an actor named "Acme Poland" of type "organization" under parent "Acme Holding"
    Then the response status should be 201
    And the actor response has parent "Acme Holding" and level 1

  Scenario: Create an actor under an unknown parent fails
    When I create an actor named "Orphan" of type "organization" under an unknown parent
    Then the response status should be 404

  Scenario: Get direct children of an actor
    Given a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an actor exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the children of the actor "Acme Holding"
    Then the response status should be 200
    And the actor list contains exactly "Acme Poland"

  Scenario: Get the full actor tree
    Given a root actor exists with name "Acme Holding" and type "organization"
    And a root actor exists with name "GreenLeaf Partners" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I request the actor tree
    Then the response status should be 200
    And the actor tree has a root "Acme Holding" with child "Acme Poland"
    And the actor tree has a root "GreenLeaf Partners" with no children

  Scenario: Get descendants of an actor
    Given a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an actor exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the descendants of the actor "Acme Holding"
    Then the response status should be 200
    And the actor list contains exactly "Acme Poland, Sarah Palmer"

  Scenario: Move an actor to a different parent
    Given a root actor exists with name "Acme Holding" and type "organization"
    And a root actor exists with name "TechNova Solutions" and type "organization"
    And an actor exists with name "Sarah Palmer" and type "individual" under parent "Acme Holding"
    When I move the actor "Sarah Palmer" under "TechNova Solutions"
    Then the response status should be 200
    And the actor response has parent "TechNova Solutions" and level 1
    And the descendants of "TechNova Solutions" contain exactly "Sarah Palmer"
    And the event "marketlum.actor.updated" was published with the entity's id

  Scenario: Move an actor to root
    Given a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I move the actor "Acme Poland" to root
    Then the response status should be 200
    And the actor response has no parent and level 0

  Scenario: Move to a non-existent parent fails
    Given a root actor exists with name "Acme Holding" and type "organization"
    When I move the actor "Acme Holding" under an unknown parent
    Then the response status should be 404

  Scenario: Move an actor into its own descendant fails
    Given a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an actor exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I move the actor "Acme Holding" under "Sarah Palmer"
    Then the response status should be 400

  Scenario: Move an actor into itself fails
    Given a root actor exists with name "Acme Holding" and type "organization"
    When I move the actor "Acme Holding" under "Acme Holding"
    Then the response status should be 400

  Scenario: Deleting an actor with sub-actors is rejected
    Given a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    When I delete the actor "Acme Holding"
    Then the response status should be 409
    When I move the actor "Acme Poland" to root
    And I delete the actor "Acme Holding"
    Then the response status should be 204
