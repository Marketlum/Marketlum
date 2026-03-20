Feature: Search Pipelines

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "Sales" and color "#3b82f6"
    And a pipeline exists with name "Support" and color "#ef4444"
    And a pipeline exists with name "Onboarding" and color "#10b981"
    When I search pipelines
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search by name text
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "Sales Pipeline" and color "#3b82f6"
    And a pipeline exists with name "Sales Funnel" and color "#ef4444"
    And a pipeline exists with name "Support Queue" and color "#10b981"
    When I search pipelines with search "Sales"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by valueStreamId
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Commerce"
    And a value stream exists with name "Support"
    And a pipeline exists with name "Commerce Pipe" and color "#3b82f6" and valueStream "Commerce"
    And a pipeline exists with name "Support Pipe" and color "#ef4444" and valueStream "Support"
    And a pipeline exists with name "General Pipe" and color "#10b981"
    When I search pipelines with valueStreamId for "Commerce"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Sort by name ascending
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "Charlie" and color "#3b82f6"
    And a pipeline exists with name "Alpha" and color "#ef4444"
    And a pipeline exists with name "Bravo" and color "#10b981"
    When I search pipelines sorted by "name" "ASC"
    Then the response status should be 200
    And the first pipeline should have name "Alpha"

  Scenario: Default sort by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "First" and color "#3b82f6"
    And a pipeline exists with name "Second" and color "#ef4444"
    And a pipeline exists with name "Third" and color "#10b981"
    When I search pipelines
    Then the response status should be 200
    And the first pipeline should have name "Third"

  Scenario: Empty results
    Given I am authenticated as "admin@marketlum.com"
    When I search pipelines with search "NonExistent"
    Then the response status should be 200
    And the total count should be 0
