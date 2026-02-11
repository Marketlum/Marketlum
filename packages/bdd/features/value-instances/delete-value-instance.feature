Feature: Delete Value Instance

  Scenario: Successfully delete a value instance
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a value instance exists with name "Panel Unit #1" for value "Solar Panel"
    When I delete the value instance
    Then the response status should be 204

  Scenario: Delete a non-existent value instance returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the value instance with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the value instance with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
