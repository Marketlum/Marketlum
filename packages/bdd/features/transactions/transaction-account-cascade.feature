Feature: Transaction Account Cascade

  Scenario: Deleting an account cascades to its transactions
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    And an actor exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Source Account" for actor "Supplier Co"
    And an account exists with name "Destination Account" for actor "Buyer Inc"
    And a transaction exists from "Source Account" to "Destination Account" with amount "100.00"
    When I delete the account "Source Account"
    And I request the transaction by its ID
    Then the response status should be 404
