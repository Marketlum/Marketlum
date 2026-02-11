Feature: Global Search

  Scenario: Search returns matching values by name
    Given I am authenticated as "admin@marketlum.com"
    And a value named "Solar Panel" exists
    When I search for "Solar"
    Then the response status should be 200
    And the search results should contain 1 item
    And the search results should include a "value" named "Solar Panel"

  Scenario: Search returns matching agents by name
    Given I am authenticated as "admin@marketlum.com"
    And an agent named "Tesla Motors" exists
    When I search for "Tesla"
    Then the response status should be 200
    And the search results should contain 1 item
    And the search results should include an "agent" named "Tesla Motors"

  Scenario: Search returns matching users by name
    Given I am authenticated as "admin@marketlum.com"
    And a user named "John Doe" with email "john@example.com" exists
    When I search for "John"
    Then the response status should be 200
    And the search results should contain 1 item
    And the search results should include a "user" named "John Doe"

  Scenario: Search returns matching users by email
    Given I am authenticated as "admin@marketlum.com"
    And a user named "Jane Smith" with email "jane@energy.com" exists
    When I search for "jane@energy.com"
    Then the response status should be 200
    And the search results should contain 1 item
    And the search results should include a "user" named "Jane Smith"

  Scenario: Search returns results from multiple entity types
    Given I am authenticated as "admin@marketlum.com"
    And a value named "Energy Credit" exists
    And an agent named "Energy Corp" exists
    When I search for "Energy"
    Then the response status should be 200
    And the search results should contain 2 items
    And the search results should include a "value" named "Energy Credit"
    And the search results should include an "agent" named "Energy Corp"

  Scenario: Search with no matches returns empty results
    Given I am authenticated as "admin@marketlum.com"
    When I search for "xyznonexistent"
    Then the response status should be 200
    And the search results should contain 0 items

  Scenario: Search ranks name matches higher than purpose matches
    Given I am authenticated as "admin@marketlum.com"
    And a value named "Hydrogen Fuel" exists
    And an agent named "Fuel Distributors" with purpose "Hydrogen supply chain" exists
    When I search for "Hydrogen"
    Then the response status should be 200
    And the search results should contain 2 items
    And the first search result should be the "value" named "Hydrogen Fuel"

  Scenario: Search results respect limit parameter
    Given I am authenticated as "admin@marketlum.com"
    And a value named "Alpha Item" exists
    And a value named "Alpha Widget" exists
    And a value named "Alpha Device" exists
    When I search for "Alpha" with limit 2
    Then the response status should be 200
    And the search results should contain 2 items

  Scenario: Unauthenticated search is rejected
    When I search for "test"
    Then the response status should be 401
