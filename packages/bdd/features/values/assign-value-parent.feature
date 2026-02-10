Feature: Assign Parent to Values

  Scenario: Create value with parent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Parent Value" and type "product"
    When I create a value with parent "Parent Value" and parentType "on_top_of" and:
      | name        | type    | purpose          |
      | Child Value | product | Has a parent     |
    Then the response status should be 201
    And the response should include parent "Parent Value"
    And the response should include parentType "on_top_of"

  Scenario: Create value with non-existent parent
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent parent and:
      | name      | type    | purpose         |
      | Value Two | product | Bad parent ref  |
    Then the response status should be 404

  Scenario: Update value's parent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Parent A" and type "product"
    And a value exists with name "Parent B" and type "service"
    And a value exists with name "Child Value" and type "product" and parent "Parent A" and parentType "on_top_of"
    When I update the value's parent to "Parent B" with parentType "part_of"
    Then the response status should be 200
    And the response should include parent "Parent B"
    And the response should include parentType "part_of"

  Scenario: Remove value's parent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Parent Value" and type "product"
    And a value exists with name "Child Value" and type "product" and parent "Parent Value" and parentType "on_top_of"
    When I update the value's parent to null
    Then the response status should be 200
    And the response should have null parent

  Scenario: Get value by ID includes parent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Parent Value" and type "product"
    And a value exists with name "Child Value" and type "product" and parent "Parent Value" and parentType "part_of"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include parent "Parent Value"
    And the response should include parentType "part_of"

  Scenario: List values includes parent data
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Parent Value" and type "product"
    And a value exists with name "Child Value" and type "product" and parent "Parent Value" and parentType "on_top_of"
    When I request the list of values
    Then the response status should be 200
    And at least one value in the list should include parent "Parent Value"

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
