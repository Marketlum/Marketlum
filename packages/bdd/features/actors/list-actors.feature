Feature: List Agents

  Scenario: List agents with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | purpose           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
      | Agent Three| virtual      | A virtual agent       |
    When I request the list of agents
    Then the response status should be 200
    And the response should contain a paginated list

  Scenario: Filter agents by type
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | purpose           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
    When I request the list of agents with type "organization"
    Then the response status should be 200
    And all returned agents should have type "organization"

  Scenario: Search agents by name
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name       | type         | purpose           |
      | Agent One  | organization | An organization agent |
      | Agent Two  | individual   | An individual agent   |
    When I request the list of agents with search "One"
    Then the response status should be 200
    And all returned agents should have "One" in their name or purpose

  Scenario: Filter by taxonomy matching main taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Electronics"
    And a taxonomy exists with name "Clothing"
    And an agent exists with name "Tech Corp" and type "organization" and main taxonomy "Electronics"
    And an agent exists with name "Fashion Ltd" and type "organization" and main taxonomy "Clothing"
    When I request the list of agents with taxonomyId for "Electronics"
    Then the response status should be 200
    And the response should contain 1 agent
    And all returned agents should have taxonomy "Electronics"

  Scenario: Filter by taxonomy matching general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Software"
    And a taxonomy exists with name "Hardware"
    And an agent exists with name "Dev Studio" and type "organization" and general taxonomies "Software"
    And an agent exists with name "Chip Maker" and type "organization" and general taxonomies "Hardware"
    When I request the list of agents with taxonomyId for "Software"
    Then the response status should be 200
    And the response should contain 1 agent
    And all returned agents should have taxonomy "Software"

  Scenario: Filter matches both main and general taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Technology"
    And a taxonomy exists with name "Finance"
    And an agent exists with name "Main Tech" and type "organization" and main taxonomy "Technology"
    And an agent exists with name "General Tech" and type "individual" and general taxonomies "Technology"
    And an agent exists with name "Bank Corp" and type "organization" and main taxonomy "Finance"
    When I request the list of agents with taxonomyId for "Technology"
    Then the response status should be 200
    And the response should contain 2 agents
    And all returned agents should have taxonomy "Technology"

  Scenario: Unauthenticated request is rejected
    When I request the list of agents
    Then the response status should be 401
