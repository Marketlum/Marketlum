Feature: Get Archetype

  Scenario: Get an existing archetype by ID
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Market Maker"
    When I request the archetype by its ID
    Then the response status should be 200
    And the response should contain an archetype with name "Market Maker"

  Scenario: Get archetype with taxonomies loaded
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And a taxonomy exists with name "Region"
    And an archetype exists with name "Classified Agent" and taxonomies "Industry,Region"
    When I request the archetype by its ID
    Then the response status should be 200
    And the response should contain an archetype with name "Classified Agent"
    And the response should contain 2 taxonomies

  Scenario: Get a non-existent archetype returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an archetype with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an archetype with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
