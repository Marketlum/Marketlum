Feature: Move Channel

  Scenario: Move a channel to a new parent
    Given I am authenticated as "admin@marketlum.com"
    And the following channel tree exists:
      | name             | parent           |
      | Root A           |                  |
      | Root B           |                  |
      | Child            | Root A           |
    When I move "Child" to parent "Root B"
    Then the response status should be 200
    And the children of "Root B" should include "Child"

  Scenario: Move a channel to root
    Given I am authenticated as "admin@marketlum.com"
    And the following channel tree exists:
      | name             | parent           |
      | Root Channel     |                  |
      | Child Channel    | Root Channel     |
    When I move "Child Channel" to root
    Then the response status should be 200
    And the root channels should include "Child Channel"

  Scenario: Move a non-existent channel returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I move channel with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 404
