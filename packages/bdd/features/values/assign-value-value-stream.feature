Feature: Assign Value Stream to Values

  Scenario: Create value with value stream
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Supply Chain"
    When I create a value with value stream "Supply Chain" and:
      | name      | type    | purpose              |
      | Value One | product | Has a value stream   |
    Then the response status should be 201
    And the response should include value stream "Supply Chain"

  Scenario: Create value with non-existent value stream
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent value stream and:
      | name      | type    | purpose                |
      | Value Two | product | Bad value stream ref   |
    Then the response status should be 404

  Scenario: Update value's value stream
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Supply Chain"
    And a value stream exists with name "Distribution"
    And a value exists with name "Value Three" and type "product" and value stream "Supply Chain"
    When I update the value's value stream to "Distribution"
    Then the response status should be 200
    And the response should include value stream "Distribution"

  Scenario: Remove value's value stream
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Supply Chain"
    And a value exists with name "Value Four" and type "product" and value stream "Supply Chain"
    When I update the value's value stream to null
    Then the response status should be 200
    And the response should have null value stream

  Scenario: List values includes value stream data
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Supply Chain"
    And a value exists with name "Value Five" and type "product" and value stream "Supply Chain"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include value stream "Supply Chain"
