Feature: Delete Actor

  Scenario: Successfully delete an actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor One" and type "organization"
    When I delete the actor
    Then the response status should be 204

  Scenario: Delete a non-existent actor returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
