Feature: Get Pipeline

  Scenario: Get an existing pipeline by ID
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "Sales Pipe" and color "#3b82f6"
    When I request the pipeline by its ID
    Then the response status should be 200
    And the response should contain a pipeline with name "Sales Pipe"

  Scenario: Get pipeline with valueStream loaded
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Commerce"
    And a pipeline exists with name "Commerce Pipe" and color "#10b981" and valueStream "Commerce"
    When I request the pipeline by its ID
    Then the response status should be 200
    And the response should contain a pipeline with name "Commerce Pipe"
    And the response should contain a valueStream with name "Commerce"

  Scenario: Get a non-existent pipeline returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a pipeline with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a pipeline with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
