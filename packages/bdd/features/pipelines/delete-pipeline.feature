Feature: Delete Pipeline

  Scenario: Delete an existing pipeline
    Given I am authenticated as "admin@marketlum.com"
    And a pipeline exists with name "To Delete" and color "#3b82f6"
    When I delete the pipeline
    Then the response status should be 204

  Scenario: Delete a non-existent pipeline returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the pipeline with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the pipeline with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
