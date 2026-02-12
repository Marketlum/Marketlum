Feature: Delete Offering

  Scenario: Delete an existing offering
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "To Delete"
    When I delete the offering
    Then the response status should be 204

  Scenario: Delete offering with components cascades
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Widget A"
    And an offering exists with name "Bundle" and a component
    When I delete the offering
    Then the response status should be 204

  Scenario: Delete a non-existent offering returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the offering with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the offering with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
