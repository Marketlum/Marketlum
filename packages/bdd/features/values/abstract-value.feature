Feature: Abstract Value

  Scenario: Create a value marked as abstract
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name           | type    | abstract |
      | Abstract Value | product | true     |
    Then the response status should be 201
    And the response should contain a value with name "Abstract Value"
    And the response should have abstract set to true

  Scenario: Create a value defaults to non-abstract
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name            | type    |
      | Concrete Value  | product |
    Then the response status should be 201
    And the response should have abstract set to false

  Scenario: Update a value to be abstract
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "My Value" and type "product"
    When I update the value's abstract flag to true
    Then the response status should be 200
    And the response should have abstract set to true

  Scenario: Update a value to not be abstract
    Given I am authenticated as "admin@marketlum.com"
    And an abstract value exists with name "Abstract Val" and type "service"
    When I update the value's abstract flag to false
    Then the response status should be 200
    And the response should have abstract set to false
