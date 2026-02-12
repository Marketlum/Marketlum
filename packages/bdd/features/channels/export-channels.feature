Feature: Export Channels

  Scenario: Export all channels with high limit returns all records
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name         | color   |
      | Channel One  | #ff0000 |
      | Channel Two  | #00ff00 |
      | Channel Three| #0000ff |
    When I request the list of channels with limit 10000
    Then the response status should be 200
    And the response should contain 3 channels

  Scenario: Export channels with search filter
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name           | color   |
      | Sales Channel  | #ff0000 |
      | Sales Support  | #00ff00 |
      | Marketing      | #0000ff |
    When I request the list of channels with limit 10000 and search "Sales"
    Then the response status should be 200
    And the response should contain 2 channels

  Scenario: Export channels with sort
    Given I am authenticated as "admin@marketlum.com"
    And the following channels exist:
      | name      | color   |
      | Charlie   | #ff0000 |
      | Alpha     | #00ff00 |
      | Bravo     | #0000ff |
    When I request the list of channels with limit 10000 sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first returned channel should have name "Alpha"
