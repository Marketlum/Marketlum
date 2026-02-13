Feature: Delete Exchange

  Scenario: Delete an existing exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "To Delete"
    When I delete the exchange
    Then the response status should be 204

  Scenario: Delete a non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the exchange with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the exchange with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
