Feature: Get Value Instance

  Scenario: Get an existing value instance by ID
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Panel Unit #1" for value "Solar Panel"
    When I request the value instance by its ID
    Then the response status should be 200
    And the response should contain a value instance with name "Panel Unit #1"

  Scenario: Get a non-existent value instance returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a value instance with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a value instance with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
