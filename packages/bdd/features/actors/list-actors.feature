Feature: List Actors

  Scenario: List actors with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following actors exist:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
      | Actor Two  | individual   | An individual actor   |
      | Actor Three| virtual      | A virtual actor       |
    When I request the list of actors
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter actors by type
    Given I am authenticated as "admin@marketlum.com"
    And the following actors exist:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
      | Actor Two  | individual   | An individual actor   |
    When I request the list of actors with type "organization"
    Then the response status should be 200
    And all returned actors should have type "organization"

  Scenario: Search actors by name
    Given I am authenticated as "admin@marketlum.com"
    And the following actors exist:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
      | Actor Two  | individual   | An individual actor   |
    When I request the list of actors with search "One"
    Then the response status should be 200
    And all returned actors should have "One" in their name or purpose

  Scenario: Filter by taxonomy matching main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Clothing"
    And an actor exists with name "Tech Corp" and type "organization" and main taxonomy "Electronics"
    And an actor exists with name "Fashion Ltd" and type "organization" and main taxonomy "Clothing"
    When I request the list of actors with taxonomyId for "Electronics"
    Then the response status should be 200
    And the response should contain 1 actor
    And all returned actors should have taxonomy "Electronics"

  Scenario: Filter by taxonomy matching general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    And an actor exists with name "Dev Studio" and type "organization" and general taxonomies "Software"
    And an actor exists with name "Chip Maker" and type "organization" and general taxonomies "Hardware"
    When I request the list of actors with taxonomyId for "Software"
    Then the response status should be 200
    And the response should contain 1 actor
    And all returned actors should have taxonomy "Software"

  Scenario: Filter matches both main and general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Technology"
    And a taxonomy exists with name "Finance"
    And an actor exists with name "Main Tech" and type "organization" and main taxonomy "Technology"
    And an actor exists with name "General Tech" and type "individual" and general taxonomies "Technology"
    And an actor exists with name "Bank Corp" and type "organization" and main taxonomy "Finance"
    When I request the list of actors with taxonomyId for "Technology"
    Then the response status should be 200
    And the response should contain 2 actors
    And all returned actors should have taxonomy "Technology"

  Scenario: Unauthenticated request is rejected
    When I request the list of actors
    Then the response status should be 401
