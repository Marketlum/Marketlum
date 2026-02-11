Feature: Get Transaction

  Scenario: Get an existing transaction by ID
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for agent "Supplier Co"
    And an account exists with name "Destination Account" for agent "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.50"
    When I request the transaction by its ID
    Then the response status should be 200
    And the response should contain a transaction with amount "100.50"

  Scenario: Get a non-existent transaction returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a transaction with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a transaction with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
