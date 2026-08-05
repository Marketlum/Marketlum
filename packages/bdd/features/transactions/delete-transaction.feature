Feature: Delete Transaction

  Scenario: Successfully delete a transaction
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    And an actor exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for actor "Supplier Co"
    And an account exists with name "Destination Account" for actor "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.00"
    When I delete the transaction
    Then the response status should be 204

  Scenario: Delete a non-existent transaction returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the transaction with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the transaction with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
