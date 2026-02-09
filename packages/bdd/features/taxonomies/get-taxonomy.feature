Feature: Get Taxonomy

  Scenario: Get an existing taxonomy by ID
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I request the taxonomy by its ID
    Then the response status should be 200
    And the response should contain a taxonomy with name "Electronics"

  Scenario: Get a non-existent taxonomy returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a taxonomy with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request a taxonomy with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
