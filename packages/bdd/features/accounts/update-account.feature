Feature: Update Account

  Scenario: Successfully update an account's name
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Energy Account" for value "Solar Panel"
    When I update the account's name to "Renewable Account"
    Then the response status should be 200
    And the response should contain an account with name "Renewable Account"

  Scenario: Update a non-existent account returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the account with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the account with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
