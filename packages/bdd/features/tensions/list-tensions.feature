Feature: List Tensions

  Scenario: List tensions with pagination
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Acme Corp"
    And a tension exists with name "Tension Alpha"
    And a tension exists with name "Tension Beta"
    And a tension exists with name "Tension Gamma"
    When I list tensions with page 1 and limit 2
    Then the response status should be 200
    And the response should contain 2 tensions
    And the response meta should have total 3

  Scenario: Filter tensions by agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent One"
    And an agent exists with name "Agent Two"
    And a tension exists with name "Tension One" for agent "Agent One"
    And a tension exists with name "Tension Two" for agent "Agent Two"
    When I list tensions filtered by agent "Agent One"
    Then the response status should be 200
    And the response should contain 1 tension
    And the first tension should have name "Tension One"

  Scenario: Filter tensions by lead user
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Filter Agent"
    And a user exists with name "Lead User"
    And a tension exists with name "Led Tension" with lead "Lead User"
    And a tension exists with name "Unled Tension"
    When I list tensions filtered by lead "Lead User"
    Then the response status should be 200
    And the response should contain 1 tension
    And the first tension should have name "Led Tension"

  Scenario: Search tensions by name
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Search Agent"
    And a tension exists with name "Unique Searchable Tension"
    And a tension exists with name "Another Tension"
    When I search tensions for "Unique Searchable"
    Then the response status should be 200
    And the response should contain 1 tension
    And the first tension should have name "Unique Searchable Tension"
