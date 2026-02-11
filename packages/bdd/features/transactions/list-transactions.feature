Feature: List Transactions

  Scenario: List transactions with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And the following transactions exist:
      | description     | amount |
      | Payment One     | 10.00  |
      | Payment Two     | 20.00  |
      | Payment Three   | 30.00  |
    When I request the list of transactions
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter transactions by fromAccountId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an agent exists with name "Retailer Ltd" and type "organization"
    And an account exists with name "Account A" for agent "Supplier Co"
    And an account exists with name "Account B" for agent "Buyer Inc"
    And an account exists with name "Account C" for agent "Retailer Ltd"
    And a transaction exists from "Account A" to "Account B" with amount "10.00"
    And a transaction exists from "Account C" to "Account B" with amount "20.00"
    When I request the list of transactions with fromAccountId for "Account A"
    Then the response status should be 200
    And the response should contain 1 transaction
    And all returned transactions should have fromAccount "Account A"

  Scenario: Filter transactions by toAccountId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an agent exists with name "Retailer Ltd" and type "organization"
    And an account exists with name "Account A" for agent "Supplier Co"
    And an account exists with name "Account B" for agent "Buyer Inc"
    And an account exists with name "Account C" for agent "Retailer Ltd"
    And a transaction exists from "Account A" to "Account B" with amount "10.00"
    And a transaction exists from "Account A" to "Account C" with amount "20.00"
    When I request the list of transactions with toAccountId for "Account B"
    Then the response status should be 200
    And the response should contain 1 transaction
    And all returned transactions should have toAccount "Account B"

  Scenario: Search transactions by description
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "10.00" and description "Energy payment"
    And a transaction exists from "Source Account" to "Destination Account" with amount "20.00" and description "Carbon credit"
    When I request the list of transactions with search "Energy"
    Then the response status should be 200
    And all returned transactions should have "Energy" in their description

  Scenario: Unauthenticated request is rejected
    When I request the list of transactions
    Then the response status should be 401
