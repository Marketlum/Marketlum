Feature: Assign Value Instance Value

  Scenario: Update value instance's value
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value exists with name "Wind Turbine" and type "product"
    And a value instance exists with name "Unit Alpha" for value "Solar Panel"
    When I update the value instance's value to "Wind Turbine"
    Then the response status should be 200
    And the response should contain a value instance with value "Wind Turbine"

  Scenario: Update value instance with non-existent value fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Unit Alpha" for value "Solar Panel"
    When I update the value instance's value to a non-existent ID
    Then the response status should be 404

  Scenario: Deleting a value cascades to its instances
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Unit Alpha" for value "Solar Panel"
    When I delete the value "Solar Panel"
    And I request the value instance by its ID
    Then the response status should be 404
