Feature: Update Value

  Scenario: Successfully update a value's name
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Value One" and type "product"
    When I update the value's name to "Value Updated"
    Then the response status should be 200
    And the response should contain a value with name "Value Updated"

  Scenario: Update a non-existent value returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the value with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the value with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
