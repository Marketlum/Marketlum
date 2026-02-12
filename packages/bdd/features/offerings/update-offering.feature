Feature: Update Offering

  Scenario: Update offering name
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Old Name"
    When I update the offering's name to "New Name"
    Then the response status should be 200
    And the response should contain an offering with name "New Name"

  Scenario: Update offering state from draft to live
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Draft Plan"
    When I update the offering's state to "live"
    Then the response status should be 200
    And the response should contain an offering with state "live"

  Scenario: Replace offering components
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Widget A"
    And a value exists with name "Widget B"
    And a value exists with name "Widget C"
    And an offering exists with name "Bundle" and components for "Widget A" and "Widget B"
    When I replace the offering components with "Widget B" and "Widget C"
    Then the response status should be 200
    And the response should contain 2 components
    And the components should include "Widget B" and "Widget C"

  Scenario: Update a non-existent offering returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the offering with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the offering with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
