Feature: Update Pipeline

  Scenario: Update all pipeline fields
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "New Stream"
    And a pipeline exists with name "Old Name" and color "#3b82f6"
    When I update the pipeline with:
      | name       | purpose       | description       | color   |
      | New Name   | New purpose   | New description   | #ef4444 |
    Then the response status should be 200
    And the response should contain a pipeline with name "New Name"
    And the response should contain a pipeline with purpose "New purpose"
    And the response should contain a pipeline with description "New description"
    And the response should contain a pipeline with color "#ef4444"
    And the response should contain a valueStream with name "New Stream"

  Scenario: Partial update
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "Original" and color "#3b82f6"
    When I update the pipeline's name to "Updated"
    Then the response status should be 200
    And the response should contain a pipeline with name "Updated"
    And the response should contain a pipeline with color "#3b82f6"

  Scenario: Clear optional fields
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Commerce"
    And a pipeline exists with name "Full Pipe" and color "#3b82f6" and purpose "Some purpose" and valueStream "Commerce"
    When I clear the pipeline optional fields
    Then the response status should be 200
    And the response purpose should be null
    And the response description should be null
    And the response valueStream should be null

  Scenario: Update a non-existent pipeline returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the pipeline with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the pipeline with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
