Feature: Delete Account

  Scenario: Successfully delete an account
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Energy Account" for value "Solar Panel"
    When I delete the account
    Then the response status should be 204

  Scenario: Delete a non-existent account returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the account with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the account with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
