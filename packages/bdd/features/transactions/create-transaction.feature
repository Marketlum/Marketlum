Feature: Create Transaction

  Scenario: Successfully create a new transaction
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    When I create a transaction with:
      | description     | amount  |
      | Initial payment | 100.50  |
    Then the response status should be 201
    And the response should contain a transaction with fromAccount "Source Account"
    And the response should contain a transaction with toAccount "Destination Account"
    And the response should contain a transaction with amount "100.50"

  Scenario: Creating a transaction with same from and to account fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Self Account" for agent "Supplier Co"
    When I create a transaction from "Self Account" to "Self Account" with amount "50.00"
    Then the response status should be 400

  Scenario: Creating a transaction with non-existent fromAccount fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Destination Account" for agent "Supplier Co"
    When I create a transaction with non-existent fromAccount
    Then the response status should be 404

  Scenario: Creating a transaction with invalid amount fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    When I create a transaction with invalid amount "abc"
    Then the response status should be 400

  Scenario: Successfully create a transaction with only fromAccount
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    When I create a transaction from "Source Account" with amount "75.00"
    Then the response status should be 201
    And the response should contain a transaction with fromAccount "Source Account"
    And the response should contain a transaction with toAccount null
    And the response should contain a transaction with amount "75.00"

  Scenario: Successfully create a transaction with only toAccount
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    When I create a transaction to "Destination Account" with amount "50.00"
    Then the response status should be 201
    And the response should contain a transaction with fromAccount null
    And the response should contain a transaction with toAccount "Destination Account"
    And the response should contain a transaction with amount "50.00"

  Scenario: Creating a transaction without any account fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a transaction without any account with amount "25.00"
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a transaction unauthenticated with:
      | description     | amount |
      | Test payment    | 10.00  |
    Then the response status should be 401
