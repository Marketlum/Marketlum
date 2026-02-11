Feature: Update Transaction

  Scenario: Successfully update a transaction's description
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.00"
    When I update the transaction's description to "Updated payment"
    Then the response status should be 200
    And the response should contain a transaction with description "Updated payment"

  Scenario: Updating transaction to same from and to account fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.00"
    When I update the transaction's fromAccountId to "Destination Account"
    Then the response status should be 400

  Scenario: Update a non-existent transaction returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the transaction with ID "00000000-0000-0000-0000-000000000000" with description "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the transaction with ID "00000000-0000-0000-0000-000000000000" with description "Test"
    Then the response status should be 401
