Feature: Update Agent

  Scenario: Successfully update an agent's name
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent One" and type "organization"
    When I update the agent's name to "Agent Updated"
    Then the response status should be 200
    And the response should contain an agent with name "Agent Updated"

  Scenario: Update a non-existent agent returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the agent with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the agent with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
