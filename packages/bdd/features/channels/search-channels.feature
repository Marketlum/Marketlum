Feature: Search Channels

  Scenario: List channels with pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name         | color   |
      | Channel One  | #ff0000 |
      | Channel Two  | #00ff00 |
      | Channel Three| #0000ff |
    When I request the list of channels
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search channels by name
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name           | color   |
      | Sales Channel  | #ff0000 |
      | Sales Support  | #00ff00 |
      | Marketing      | #0000ff |
    When I request the list of channels with search "Sales"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Sort channels by name
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name      | color   |
      | Charlie   | #ff0000 |
      | Alpha     | #00ff00 |
      | Bravo     | #0000ff |
    When I request the list of channels sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first returned channel should have name "Alpha"

  Scenario: Filter channels by agentId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a channel exists with name "Channel A" and agent "Agent A"
    And a channel exists with name "Channel B" and agent "Agent B"
    And a channel exists with name "Channel C" and agent "Agent A"
    When I request the list of channels with agentId for "Agent A"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Default sort order is by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name        | color   |
      | First       | #ff0000 |
      | Second      | #00ff00 |
    When I request the list of channels
    Then the response status should be 200
    And the first returned channel should have name "Second"

  Scenario: Empty results when no channels match
    Given I am authenticated as "admin@marketlum.com"
    When I request the list of channels with search "nonexistent"
    Then the response status should be 200
    And the total count should be 0
