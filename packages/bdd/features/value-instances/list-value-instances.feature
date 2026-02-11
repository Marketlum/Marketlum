Feature: List Value Instances

  Scenario: List value instances with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And the following value instances exist for value "Solar Panel":
      | name          | purpose            |
      | Unit Alpha    | First batch        |
      | Unit Beta     | Second batch       |
      | Unit Gamma    | Third batch        |
    When I request the list of value instances
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter value instances by valueId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value exists with name "Wind Turbine" and type "product"
    And a value instance exists with name "Panel Unit" for value "Solar Panel"
    And a value instance exists with name "Turbine Unit" for value "Wind Turbine"
    When I request the list of value instances with valueId for "Solar Panel"
    Then the response status should be 200
    And the response should contain 1 value instance
    And all returned value instances should have value "Solar Panel"

  Scenario: Filter value instances by fromAgentId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Supplier Co" and type "organization"
    And a value instance exists with name "Unit A" for value "Solar Panel" with fromAgent "Supplier Co"
    And a value instance exists with name "Unit B" for value "Solar Panel"
    When I request the list of value instances with fromAgentId for "Supplier Co"
    Then the response status should be 200
    And the response should contain 1 value instance

  Scenario: Filter value instances by toAgentId
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And an agent exists with name "Buyer Inc" and type "organization"
    And a value instance exists with name "Unit A" for value "Solar Panel" with toAgent "Buyer Inc"
    And a value instance exists with name "Unit B" for value "Solar Panel"
    When I request the list of value instances with toAgentId for "Buyer Inc"
    Then the response status should be 200
    And the response should contain 1 value instance

  Scenario: Search value instances by name
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Alpha Unit" for value "Solar Panel"
    And a value instance exists with name "Beta Unit" for value "Solar Panel"
    When I request the list of value instances with search "Alpha"
    Then the response status should be 200
    And all returned value instances should have "Alpha" in their name or purpose

  Scenario: Unauthenticated request is rejected
    When I request the list of value instances
    Then the response status should be 401
