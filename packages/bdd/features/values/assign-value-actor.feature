Feature: Assign Actor to Values

  Scenario: Create value with actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    When I create a value with actor "Actor Alpha" and:
      | name      | type    | purpose        |
      | Value One | product | Has an actor   |
    Then the response status should be 201
    And the response should include actor "Actor Alpha"

  Scenario: Create value with non-existent actor
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent actor and:
      | name      | type    | purpose        |
      | Value Two | product | Bad actor ref  |
    Then the response status should be 404

  Scenario: Update value's actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    And an actor exists with name "Actor Beta" and type "individual"
    And a value exists with name "Value Three" and type "product" and actor "Actor Alpha"
    When I update the value's actor to "Actor Beta"
    Then the response status should be 200
    And the response should include actor "Actor Beta"

  Scenario: Remove value's actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    And a value exists with name "Value Four" and type "product" and actor "Actor Alpha"
    When I update the value's actor to null
    Then the response status should be 200
    And the response should have null actor

  Scenario: Get value by ID includes actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    And a value exists with name "Value Five" and type "product" and actor "Actor Alpha"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include actor "Actor Alpha"

  Scenario: List values includes actor data
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    And a value exists with name "Value Six" and type "product" and actor "Actor Alpha"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include actor "Actor Alpha"

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
