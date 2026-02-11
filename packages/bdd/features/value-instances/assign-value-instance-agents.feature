Feature: Assign Value Instance Agents

  Scenario: Create value instance with fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    When I create a value instance with fromAgent "Supplier Co" and:
      | name          | purpose     |
      | Panel Unit #1 | From test   |
    Then the response status should be 201
    And the response should include fromAgent "Supplier Co"

  Scenario: Create value instance with toAgent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Buyer Inc" and type "organization"
    When I create a value instance with toAgent "Buyer Inc" and:
      | name          | purpose     |
      | Panel Unit #2 | To test     |
    Then the response status should be 201
    And the response should include toAgent "Buyer Inc"

  Scenario: Create value instance with both fromAgent and toAgent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "Buyer Inc" and type "organization"
    When I create a value instance with fromAgent "Supplier Co" and toAgent "Buyer Inc" and:
      | name          | purpose     |
      | Panel Unit #3 | Both test   |
    Then the response status should be 201
    And the response should include fromAgent "Supplier Co"
    And the response should include toAgent "Buyer Inc"

  Scenario: Update value instance's fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And an agent exists with name "New Supplier" and type "organization"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with fromAgent "Supplier Co"
    When I update the value instance's fromAgent to "New Supplier"
    Then the response status should be 200
    And the response should include fromAgent "New Supplier"

  Scenario: Remove value instance's fromAgent
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with fromAgent "Supplier Co"
    When I update the value instance's fromAgent to null
    Then the response status should be 200
    And the response should have null fromAgent

  Scenario: Create value instance with non-existent agent fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    When I create a value instance with non-existent fromAgent and:
      | name          | purpose     |
      | Panel Unit    | Bad agent   |
    Then the response status should be 404
