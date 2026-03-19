Feature: Value Lifecycle Stage

  Scenario: Create a value with a lifecycle stage
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name       | type    | lifecycleStage |
      | My Value   | product | alpha          |
    Then the response status should be 201
    And the response should contain a value with name "My Value"
    And the response should have lifecycleStage "alpha"

  Scenario: Create a value without lifecycle stage defaults to null
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name            | type    |
      | Plain Value     | product |
    Then the response status should be 201
    And the response should have lifecycleStage null

  Scenario: Update a value's lifecycle stage
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Test Value" and type "service"
    When I update the value's lifecycleStage to "stable"
    Then the response status should be 200
    And the response should have lifecycleStage "stable"

  Scenario: Create a value with invalid lifecycle stage fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name       | type    | lifecycleStage |
      | Bad Value  | product | unknown        |
    Then the response status should be 400

  Scenario: Filter values by lifecycle stage
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name     | type    | lifecycleStage |
      | Value A  | product | idea           |
      | Value B  | service | stable         |
      | Value C  | product | stable         |
    When I request the list of values filtered by lifecycleStage "stable"
    Then the response status should be 200
    And the response should contain 2 values
