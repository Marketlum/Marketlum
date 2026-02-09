Feature: Update Taxonomy

  Scenario: Successfully update a taxonomy's name
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I update the taxonomy's name to "Consumer Electronics"
    Then the response status should be 200
    And the response should contain a taxonomy with name "Consumer Electronics"

  Scenario: Update a non-existent taxonomy returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the taxonomy with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the taxonomy with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
