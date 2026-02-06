Feature: List Agents

  Scenario: List agents with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type   | description     |
      | Agent One  | buyer  | A buyer agent   |
      | Agent Two  | seller | A seller agent  |
      | Agent Three| broker | A broker agent  |
    When I request the list of agents
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter agents by type
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type   | description     |
      | Agent One  | buyer  | A buyer agent   |
      | Agent Two  | seller | A seller agent  |
    When I request the list of agents with type "buyer"
    Then the response status should be 200
    And all returned agents should have type "buyer"

  Scenario: Search agents by name
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type   | description     |
      | Agent One  | buyer  | A buyer agent   |
      | Agent Two  | seller | A seller agent  |
    When I request the list of agents with search "One"
    Then the response status should be 200
    And all returned agents should have "One" in their name or description

  Scenario: Unauthenticated request is rejected
    When I request the list of agents
    Then the response status should be 401
