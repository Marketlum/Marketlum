Feature: Assign Lead to Value Stream

  Scenario: Create value stream with lead
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with name "Lead User"
    When I create a value stream with lead:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 201
    And the response should include lead "Lead User"

  Scenario: Create value stream with non-existent lead fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value stream with non-existent lead:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 404

  Scenario: Update value stream lead
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    And a user exists with name "New Lead"
    When I update the value stream's lead to "New Lead"
    Then the response status should be 200
    And the response should include lead "New Lead"

  Scenario: Remove value stream lead
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with name "Lead User"
    And a value stream exists with name "Supply Chain" and lead "Lead User"
    When I remove the value stream's lead
    Then the response status should be 200
    And the response should have null lead

  Scenario: Unauthenticated request is rejected
    When I create a value stream with:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 401
