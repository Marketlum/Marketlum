Feature: Create Account

  Scenario: Successfully create a new account
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    When I create an account with:
      | name            | description       |
      | Energy Account  | Main energy pool  |
    Then the response status should be 201
    And the response should contain an account with name "Energy Account"
    And the response should contain an account with value "Solar Panel"
    And the response should contain an account with agent "Supplier Co"
    And the response should contain an account with balance "0.00"

  Scenario: Creating an account without valueId fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Supplier Co" and type "organization"
    When I create an account without valueId with:
      | name            |
      | Orphan Account  |
    Then the response status should be 400

  Scenario: Creating an account with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    When I create an account with empty name
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create an account unauthenticated with:
      | name            |
      | Energy Account  |
    Then the response status should be 401
