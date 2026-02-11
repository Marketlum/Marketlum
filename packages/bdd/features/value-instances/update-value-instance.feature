Feature: Update Value Instance

  Scenario: Successfully update a value instance's name
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Panel Unit #1" for value "Solar Panel"
    When I update the value instance's name to "Panel Unit Updated"
    Then the response status should be 200
    And the response should contain a value instance with name "Panel Unit Updated"

  Scenario: Update a non-existent value instance returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the value instance with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the value instance with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
