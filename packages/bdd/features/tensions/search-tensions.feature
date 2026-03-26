Feature: Search Tensions

  Scenario: Full-text search finds tensions by name
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Search Corp"
    And a tension exists with name "Renewable Energy Gap"
    And a tension exists with name "Digital Transformation"
    When I search the global search for "Renewable Energy"
    Then the response status should be 200
    And the search results should contain a tension with name "Renewable Energy Gap"

  Scenario: Full-text search finds tensions by currentContext
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Context Corp"
    And a tension exists with name "Context Tension" with currentContext "blockchain distributed ledger technology"
    When I search the global search for "blockchain distributed"
    Then the response status should be 200
    And the search results should contain a tension with name "Context Tension"
