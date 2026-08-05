Feature: List Values

  Scenario: List values with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name        | type         | purpose               |
      | Value One   | product      | A product value       |
      | Value Two   | service      | A service value       |
      | Value Three | relationship | A relationship value  |
    When I request the list of values
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter values by type
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name       | type    | purpose           |
      | Value One  | product | A product value   |
      | Value Two  | service | A service value   |
    When I request the list of values with type "product"
    Then the response status should be 200
    And all returned values should have type "product"

  Scenario: Filter values by actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha" and type "organization"
    And a value exists with name "Value One" and type "product" and actor "Actor Alpha"
    And a value exists with name "Value Two" and type "service"
    When I request the list of values with actorId for "Actor Alpha"
    Then the response status should be 200
    And the response should contain 1 value
    And all returned values should have actor "Actor Alpha"

  Scenario: Filter values by taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Clothing"
    And a value exists with name "Value One" and type "product" and main taxonomy "Electronics"
    And a value exists with name "Value Two" and type "product" and main taxonomy "Clothing"
    When I request the list of values with taxonomyId for "Electronics"
    Then the response status should be 200
    And the response should contain 1 value
    And all returned values should have taxonomy "Electronics"

  Scenario: Search values by name
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name       | type    | purpose           |
      | Value One  | product | A product value   |
      | Value Two  | service | A service value   |
    When I request the list of values with search "One"
    Then the response status should be 200
    And all returned values should have "One" in their name or purpose

  Scenario: Unauthenticated request is rejected
    When I request the list of values
    Then the response status should be 401
