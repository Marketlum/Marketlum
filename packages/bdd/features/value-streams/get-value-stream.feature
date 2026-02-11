Feature: Get Value Stream

  Scenario: Get an existing value stream by ID
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I request the value stream by its ID
    Then the response status should be 200
    And the response should contain a value stream with name "Supply Chain"

  Scenario: Get a non-existent value stream returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a value stream with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a value stream with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
