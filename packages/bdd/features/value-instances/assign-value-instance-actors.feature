Feature: Assign Value Instance Actors

  Scenario: Create value instance with fromActor
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    When I create a value instance with fromActor "Supplier Co" and:
      | name          | purpose     |
      | Panel Unit #1 | From test   |
    Then the response status should be 201
    And the response should include fromActor "Supplier Co"

  Scenario: Create value instance with toActor
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Buyer Inc" and type "organization"
    When I create a value instance with toActor "Buyer Inc" and:
      | name          | purpose     |
      | Panel Unit #2 | To test     |
    Then the response status should be 201
    And the response should include toActor "Buyer Inc"

  Scenario: Create value instance with both fromActor and toActor
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    And an actor exists with name "Buyer Inc" and type "organization"
    When I create a value instance with fromActor "Supplier Co" and toActor "Buyer Inc" and:
      | name          | purpose     |
      | Panel Unit #3 | Both test   |
    Then the response status should be 201
    And the response should include fromActor "Supplier Co"
    And the response should include toActor "Buyer Inc"

  Scenario: Update value instance's fromActor
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    And an actor exists with name "New Supplier" and type "organization"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with fromActor "Supplier Co"
    When I update the value instance's fromActor to "New Supplier"
    Then the response status should be 200
    And the response should include fromActor "New Supplier"

  Scenario: Remove value instance's fromActor
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an actor exists with name "Supplier Co" and type "organization"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with fromActor "Supplier Co"
    When I update the value instance's fromActor to null
    Then the response status should be 200
    And the response should have null fromActor

  Scenario: Create value instance with non-existent actor fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    When I create a value instance with non-existent fromActor and:
      | name          | purpose     |
      | Panel Unit    | Bad actor   |
    Then the response status should be 404
