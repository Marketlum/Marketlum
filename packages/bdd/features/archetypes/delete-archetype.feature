Feature: Delete Archetype

  Scenario: Delete an existing archetype
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "To Delete"
    When I delete the archetype
    Then the response status should be 204

  Scenario: Delete archetype with taxonomies removes join records
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And an archetype exists with name "Typed Agent" and taxonomies "Industry"
    When I delete the archetype
    Then the response status should be 204

  Scenario: Deleting a taxonomy removes it from archetype
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And a taxonomy exists with name "Region"
    And an archetype exists with name "Typed Agent" and taxonomies "Industry,Region"
    When I delete the taxonomy "Industry"
    And I request the archetype by its ID
    Then the response status should be 200
    And the response should contain 1 taxonomy

  Scenario: Delete a non-existent archetype returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the archetype with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the archetype with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
