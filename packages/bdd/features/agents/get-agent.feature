Feature: Get Agent

  Scenario: Get an existing agent by ID
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent One" and type "organization"
    When I request the agent by their ID
    Then the response status should be 200
    And the response should contain an agent with name "Agent One"

  Scenario: Get a non-existent agent returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
