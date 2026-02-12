Feature: Read Channel

  Scenario: Get a channel by ID
    Given I am authenticated as "admin@marketlum.com"
    And a root channel exists with name "Sales Channel"
    When I request the channel by its ID
    Then the response status should be 200
    And the response should contain a channel with name "Sales Channel"

  Scenario: Get the channel tree
    Given I am authenticated as "admin@marketlum.com"
    And the following channel tree exists:
      | name             | parent           |
      | Root Channel     |                  |
      | Child Channel A  | Root Channel     |
      | Child Channel B  | Root Channel     |
      | Standalone       |                  |
    When I request the full channel tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Root Channel" should have 2 children

  Scenario: Get a non-existent channel returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a channel with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
