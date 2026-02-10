Feature: Delete Value

  Scenario: Successfully delete a value
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Value One" and type "product"
    When I delete the value
    Then the response status should be 204

  Scenario: Delete a non-existent value returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the value with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the value with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
