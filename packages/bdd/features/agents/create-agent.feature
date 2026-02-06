Feature: Create Agent

  Scenario: Successfully create a new agent
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent with:
      | name       | type   | description     |
      | Agent One  | buyer  | A buyer agent   |
    Then the response status should be 201
    And the response should contain an agent with name "Agent One"
    And the response should contain an agent with type "buyer"

  Scenario: Creating an agent with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent with:
      | name | type    | description |
      |      | invalid |             |
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create an agent with:
      | name       | type   | description     |
      | Agent One  | buyer  | A buyer agent   |
    Then the response status should be 401
