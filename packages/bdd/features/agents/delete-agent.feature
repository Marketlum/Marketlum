Feature: Delete Agent

  Scenario: Successfully delete an agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent One" and type "buyer"
    When I delete the agent
    Then the response status should be 204

  Scenario: Delete a non-existent agent returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
