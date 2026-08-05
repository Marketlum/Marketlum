Feature: Get Actor

  Scenario: Get an existing actor by ID
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor One" and type "organization"
    When I request the actor by their ID
    Then the response status should be 200
    And the response should contain an actor with name "Actor One"

  Scenario: Get a non-existent actor returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
