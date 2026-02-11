Feature: Account Balance

  Scenario: New account has balance of zero
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Energy Account" for value "Solar Panel"
    When I request the account by its ID
    Then the response status should be 200
    And the response should contain an account with balance "0.00"

  Scenario: Account balance increases when it is the toAccount
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.50"
    When I request the account "Destination Account" by its ID
    Then the response status should be 200
    And the response should contain an account with balance "100.50"

  Scenario: Account balance decreases when it is the fromAccount
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "50.25"
    When I request the account "Source Account" by its ID
    Then the response status should be 200
    And the response should contain an account with balance "-50.25"

  Scenario: Multiple transactions calculate net balance
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Account A" for agent "Supplier Co"
    And an account exists with name "Account B" for agent "Buyer Inc"
    And a transaction exists from "Account A" to "Account B" with amount "200.00"
    And a transaction exists from "Account B" to "Account A" with amount "75.00"
    And a transaction exists from "Account A" to "Account B" with amount "25.00"
    When I request the account "Account A" by its ID
    Then the response status should be 200
    And the response should contain an account with balance "-150.00"
