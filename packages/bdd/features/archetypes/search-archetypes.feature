Feature: Search Archetypes

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Market Maker"
    And an archetype exists with name "Supplier"
    And an archetype exists with name "Distributor"
    When I search archetypes
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search by name text
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Market Maker"
    And an archetype exists with name "Market Taker"
    And an archetype exists with name "Supplier"
    When I search archetypes with search "Market"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Search by purpose text
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Maker" and purpose "Facilitate trading"
    And an archetype exists with name "Taker" and purpose "Consume offerings"
    And an archetype exists with name "Broker" and purpose "Facilitate deals"
    When I search archetypes with search "Facilitate"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by taxonomyId
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And a taxonomy exists with name "Region"
    And an archetype exists with name "Industrial Agent" and taxonomies "Industry"
    And an archetype exists with name "Regional Agent" and taxonomies "Region"
    And an archetype exists with name "Full Agent" and taxonomies "Industry,Region"
    When I search archetypes with taxonomyId for "Industry"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Sort by name ascending
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Charlie"
    And an archetype exists with name "Alpha"
    And an archetype exists with name "Bravo"
    When I search archetypes sorted by "name" "ASC"
    Then the response status should be 200
    And the first archetype should have name "Alpha"

  Scenario: Default sort by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "First"
    And an archetype exists with name "Second"
    And an archetype exists with name "Third"
    When I search archetypes
    Then the response status should be 200
    And the first archetype should have name "Third"

  Scenario: Unauthenticated request is rejected
    When I search archetypes
    Then the response status should be 401
