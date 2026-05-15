Feature: Create Value

  Scenario: Successfully create a new value
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name       | type    | purpose             |
      | Value One  | product | A product value     |
    Then the response status should be 201
    And the response should contain a value with name "Value One"
    And the response should contain a value with type "product"

  Scenario: Successfully create a currency value
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with:
      | name | type     | purpose                |
      | USD  | currency | US dollar fiat currency |
    Then the response status should be 201
    And the response should contain a value with name "USD"
    And the response should contain a value with type "currency"

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

  Scenario: Creating a value with a valid snake_case code succeeds
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with code "example_one" and:
      | name      | type    |
      | Example   | product |
    Then the response status should be 201
    And the response should contain a value with code "example_one"

  Scenario: Creating a value with an invalid code is rejected
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with code "Example One" and:
      | name      | type    |
      | Example   | product |
    Then the response status should be 400

  Scenario: Creating a value with a duplicate code is rejected
    Given I am authenticated as "admin@marketlum.com"
    And a value with code "dup_code" exists
    When I create a value with code "dup_code" and:
      | name    | type    |
      | Other   | product |
    Then the response status should be 409
