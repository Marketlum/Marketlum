Feature: Get Account

  Scenario: Get an existing account by ID
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Energy Account" for value "Solar Panel"
    When I request the account by its ID
    Then the response status should be 200
    And the response should contain an account with name "Energy Account"
    And the response should contain an account with balance "0.00"

  Scenario: Get a non-existent account returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an account with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an account with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
