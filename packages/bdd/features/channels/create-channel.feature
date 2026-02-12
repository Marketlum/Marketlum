Feature: Create Channel

  Scenario: Successfully create a root channel with name and color
    Given I am authenticated as "admin@marketlum.com"
    When I create a channel with:
      | name           | color   |
      | Sales Channel  | #ff5733 |
    Then the response status should be 201
    And the response should contain a channel with name "Sales Channel"
    And the response should contain a channel with color "#ff5733"

  Scenario: Successfully create a root channel with purpose and agent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Sales Team"
    When I create a channel with purpose and agent:
      | name            | color   | purpose              |
      | Support Channel | #33ff57 | Customer support hub |
    Then the response status should be 201
    And the response should contain a channel with name "Support Channel"
    And the response should contain a channel with purpose "Customer support hub"
    And the response should contain a channel with an agent named "Sales Team"

  Scenario: Successfully create a child channel under parent
    Given I am authenticated as "admin@marketlum.com"
    And a root channel exists with name "Parent Channel"
    When I create a child channel with parent "Parent Channel":
      | name          | color   |
      | Child Channel | #3357ff |
    Then the response status should be 201
    And the response should contain a channel with name "Child Channel"

  Scenario: Creating a channel without name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a channel without name
    Then the response status should be 400

  Scenario: Creating a channel without color fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a channel without color
    Then the response status should be 400
