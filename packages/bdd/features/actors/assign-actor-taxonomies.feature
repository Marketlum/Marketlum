Feature: Assign Taxonomies to Actors

  Scenario: Create actor with main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create an actor with main taxonomy "Electronics" and:
      | name      | type         | purpose         |
      | Actor One | organization | Sells electronics |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"

  Scenario: Create actor with general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    When I create an actor with general taxonomies "Electronics,Software" and:
      | name      | type         | purpose       |
      | Actor Two | organization | Multi-category |
    Then the response status should be 201
    And the response should include general taxonomies "Electronics,Software"

  Scenario: Create actor with both main and general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    When I create an actor with main taxonomy "Electronics" and general taxonomies "Software,Hardware" and:
      | name        | type         | purpose      |
      | Actor Three | organization | Full taxonomy |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Create actor with non-existent main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with a non-existent main taxonomy and:
      | name       | type         | purpose |
      | Actor Four | organization | Test    |
    Then the response status should be 404

  Scenario: Create actor with non-existent general taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create an actor with a non-existent general taxonomy and existing "Electronics" and:
      | name       | type         | purpose |
      | Actor Five | organization | Test    |
    Then the response status should be 404

  Scenario: Update actor's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And an actor exists with name "Actor Six" and type "organization"
    When I update the actor's main taxonomy to "Software"
    Then the response status should be 200
    And the response should include main taxonomy "Software"

  Scenario: Remove actor's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an actor exists with name "Actor Seven" and type "organization" and main taxonomy "Electronics"
    When I update the actor's main taxonomy to null
    Then the response status should be 200
    And the response should have null main taxonomy

  Scenario: Update actor's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    And an actor exists with name "Actor Eight" and type "organization" and general taxonomies "Electronics"
    When I update the actor's general taxonomies to "Software,Hardware"
    Then the response status should be 200
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Clear actor's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an actor exists with name "Actor Nine" and type "organization" and general taxonomies "Electronics"
    When I update the actor's general taxonomies to empty
    Then the response status should be 200
    And the response should have empty general taxonomies

  Scenario: Get actor by ID includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And an actor exists with name "Actor Ten" and type "organization" and main taxonomy "Electronics" and general taxonomies "Software"
    When I request the actor by their ID
    Then the response status should be 200
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software"

  Scenario: List actors includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And an actor exists with name "Actor Eleven" and type "organization" and main taxonomy "Electronics"
    When I request the list of actors
    Then the response status should be 200
    And the first actor in the list should include main taxonomy "Electronics"

  Scenario: Unauthenticated request is rejected
    When I create an actor with:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
    Then the response status should be 401
