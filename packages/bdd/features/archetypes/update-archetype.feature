Feature: Update Archetype

  Scenario: Update archetype name
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Old Name"
    When I update the archetype's name to "New Name"
    Then the response status should be 200
    And the response should contain an archetype with name "New Name"

  Scenario: Update archetype purpose and description
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Market Maker"
    When I update the archetype with:
      | purpose            | description           |
      | Updated purpose    | Updated description   |
    Then the response status should be 200
    And the response should contain an archetype with purpose "Updated purpose"
    And the response should contain an archetype with description "Updated description"

  Scenario: Replace archetype taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And a taxonomy exists with name "Region"
    And a taxonomy exists with name "Size"
    And an archetype exists with name "Typed Agent" and taxonomies "Industry,Region"
    When I replace the archetype taxonomies with "Region,Size"
    Then the response status should be 200
    And the response should contain 2 taxonomies
    And the taxonomies should include "Region" and "Size"

  Scenario: Clear archetype taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And an archetype exists with name "Typed Agent" and taxonomies "Industry"
    When I replace the archetype taxonomies with an empty list
    Then the response status should be 200
    And the response should contain 0 taxonomies

  Scenario: Update with duplicate name fails
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "First Type"
    And an archetype exists with name "Second Type"
    When I update the archetype "Second Type" name to "First Type"
    Then the response status should be 409

  Scenario: Update a non-existent archetype returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the archetype with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the archetype with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
