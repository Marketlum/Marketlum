Feature: List Agents

  Scenario: List agents with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | description           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
      | Agent Three| virtual      | A virtual agent       |
    When I request the list of agents
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter agents by type
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | description           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
    When I request the list of agents with type "organization"
    Then the response status should be 200
    And all returned agents should have type "organization"

  Scenario: Search agents by name
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | description           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
    When I request the list of agents with search "One"
    Then the response status should be 200
    And all returned agents should have "One" in their name or description

  Scenario: Unauthenticated request is rejected
    When I request the list of agents
    Then the response status should be 401
