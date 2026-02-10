Feature: Create Value

  Scenario: Successfully create a new value
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name       | type    | purpose             |
      | Value One  | product | A product value     |
    Then the response status should be 201
    And the response should contain a value with name "Value One"
    And the response should contain a value with type "product"

  Scenario: Creating a value with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name | type    | purpose |
      |      | invalid |         |
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose             |
      | Value One  | product | A product value     |
    Then the response status should be 401
