Feature: Get Offering

  Scenario: Get an existing offering by ID
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Premium Plan"
    When I request the offering by its ID
    Then the response status should be 200
    And the response should contain an offering with name "Premium Plan"

  Scenario: Get offering with components loaded
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Widget A"
    And a value exists with name "Widget B"
    And an offering exists with name "Bundle" and components
    When I request the offering by its ID
    Then the response status should be 200
    And the response should contain an offering with name "Bundle"
    And the response should contain 2 components

  Scenario: Get a non-existent offering returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an offering with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an offering with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
