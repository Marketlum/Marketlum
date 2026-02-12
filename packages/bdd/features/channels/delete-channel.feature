Feature: Delete Channel

  Scenario: Successfully delete a leaf channel
    Given I am authenticated as "admin@marketlum.com"
    And a root channel exists with name "Leaf Channel"
    When I delete the channel
    Then the response status should be 204

  Scenario: Delete a channel with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And the following channel tree exists:
      | name             | parent           |
      | Parent Channel   |                  |
      | Child Channel    | Parent Channel   |
      | Deep Child       | Child Channel    |
    When I delete the channel "Parent Channel"
    Then the response status should be 204
    And the channel "Child Channel" should not exist
    And the channel "Deep Child" should not exist

  Scenario: Delete a non-existent channel returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the channel with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
