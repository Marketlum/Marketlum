Feature: Delete Invoice

  Scenario: Delete an existing invoice
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    When I delete the invoice
    Then the response status should be 204

  Scenario: Delete invoice cascades items
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value exists with name "Widget A"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc" with items
    When I delete the invoice
    Then the response status should be 204

  Scenario: Delete a non-existent invoice returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the invoice with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the invoice with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
