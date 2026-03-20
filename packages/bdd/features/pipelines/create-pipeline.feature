Feature: Create Pipeline

  Scenario: Create pipeline with all fields
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Commerce"
    When I create a pipeline with:
      | name          | purpose           | description            | color   |
      | Sales Pipe    | Drive revenue     | Main sales pipeline    | #3b82f6 |
    Then the response status should be 201
    And the response should contain a pipeline with name "Sales Pipe"
    And the response should contain a pipeline with purpose "Drive revenue"
    And the response should contain a pipeline with description "Main sales pipeline"
    And the response should contain a pipeline with color "#3b82f6"
    And the response should contain a valueStream with name "Commerce"

  Scenario: Create pipeline with required fields only
    Given I am authenticated as "admin@marketlum.com"
    When I create a pipeline with name "Minimal Pipe" and color "#ff0000"
    Then the response status should be 201
    And the response should contain a pipeline with name "Minimal Pipe"
    And the response should contain a pipeline with color "#ff0000"
    And the response purpose should be null
    And the response description should be null
    And the response valueStream should be null

  Scenario: Create pipeline with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a pipeline with empty name
    Then the response status should be 400

  Scenario: Create pipeline with empty color fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a pipeline with empty color
    Then the response status should be 400

  Scenario: Create pipeline with non-existent valueStream fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a pipeline with a non-existent valueStream
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create a pipeline without authentication
    Then the response status should be 401
