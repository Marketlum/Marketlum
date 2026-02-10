Feature: Assign Taxonomies to Values

  Scenario: Create value with main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create a value with main taxonomy "Electronics" and:
      | name      | type    | purpose           |
      | Value One | product | Sells electronics |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"

  Scenario: Create value with general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    When I create a value with general taxonomies "Electronics,Software" and:
      | name      | type    | purpose        |
      | Value Two | product | Multi-category |
    Then the response status should be 201
    And the response should include general taxonomies "Electronics,Software"

  Scenario: Create value with both main and general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    When I create a value with main taxonomy "Electronics" and general taxonomies "Software,Hardware" and:
      | name        | type    | purpose        |
      | Value Three | product | Full taxonomy  |
    Then the response status should be 201
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Create value with non-existent main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent main taxonomy and:
      | name       | type    | purpose |
      | Value Four | product | Test    |
    Then the response status should be 404

  Scenario: Create value with non-existent general taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    When I create a value with a non-existent general taxonomy and existing "Electronics" and:
      | name       | type    | purpose |
      | Value Five | product | Test    |
    Then the response status should be 404

  Scenario: Update value's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a value exists with name "Value Six" and type "product"
    When I update the value's main taxonomy to "Software"
    Then the response status should be 200
    And the response should include main taxonomy "Software"

  Scenario: Remove value's main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a value exists with name "Value Seven" and type "product" and main taxonomy "Electronics"
    When I update the value's main taxonomy to null
    Then the response status should be 200
    And the response should have null main taxonomy

  Scenario: Update value's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    And a value exists with name "Value Eight" and type "product" and general taxonomies "Electronics"
    When I update the value's general taxonomies to "Software,Hardware"
    Then the response status should be 200
    And the response should include general taxonomies "Software,Hardware"

  Scenario: Clear value's general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a value exists with name "Value Nine" and type "product" and general taxonomies "Electronics"
    When I update the value's general taxonomies to empty
    Then the response status should be 200
    And the response should have empty general taxonomies

  Scenario: Get value by ID includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Software"
    And a value exists with name "Value Ten" and type "product" and main taxonomy "Electronics" and general taxonomies "Software"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include main taxonomy "Electronics"
    And the response should include general taxonomies "Software"

  Scenario: List values includes taxonomy data
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a value exists with name "Value Eleven" and type "product" and main taxonomy "Electronics"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include main taxonomy "Electronics"

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
