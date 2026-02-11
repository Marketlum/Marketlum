Feature: List Accounts

  Scenario: List accounts with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And the following accounts exist:
      | name            |
      | Account Alpha   |
      | Account Beta    |
      | Account Gamma   |
    When I request the list of accounts
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter accounts by valueId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value exists with name "Wind Turbine" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Panel Account" for value "Solar Panel"
    And an account exists with name "Turbine Account" for value "Wind Turbine"
    When I request the list of accounts with valueId for "Solar Panel"
    Then the response status should be 200
    And the response should contain 1 account
    And all returned accounts should have value "Solar Panel"

  Scenario: Filter accounts by agentId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    And an account exists with name "Supplier Account" for agent "Supplier Co"
    And an account exists with name "Buyer Account" for agent "Buyer Inc"
    When I request the list of accounts with agentId for "Supplier Co"
    Then the response status should be 200
    And the response should contain 1 account
    And all returned accounts should have agent "Supplier Co"

  Scenario: Search accounts by name
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an account exists with name "Energy Pool" for value "Solar Panel"
    And an account exists with name "Carbon Credits" for value "Solar Panel"
    When I request the list of accounts with search "Energy"
    Then the response status should be 200
    And all returned accounts should have "Energy" in their name

  Scenario: Unauthenticated request is rejected
    When I request the list of accounts
    Then the response status should be 401
