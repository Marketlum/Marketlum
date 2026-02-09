Feature: Update Taxonomy

  Scenario: Successfully update a taxonomy's name
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I update the taxonomy's name to "Consumer Electronics"
    Then the response status should be 200
    And the response should contain a taxonomy with name "Consumer Electronics"

  Scenario: Successfully update a taxonomy's description and link
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I update the taxonomy with:
      | description             | link                          |
      | Updated electronics desc | https://example.com/updated  |
    Then the response status should be 200
    And the response should contain a taxonomy with description "Updated electronics desc"
    And the response should contain a taxonomy with link "https://example.com/updated"

  Scenario: Updating a taxonomy with an invalid link fails
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I update the taxonomy with:
      | link       |
      | not-a-url  |
    Then the response status should be 400

  Scenario: Update a non-existent taxonomy returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the taxonomy with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the taxonomy with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
