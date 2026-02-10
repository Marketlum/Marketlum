Feature: Get Value

  Scenario: Get an existing value by ID
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Value One" and type "product"
    When I request the value by its ID
    Then the response status should be 200
    And the response should contain a value with name "Value One"

  Scenario: Get a non-existent value returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a value with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a value with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
