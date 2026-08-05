Feature: Update Channel

  Scenario: Successfully update a channel's name
    Given I am authenticated as "admin@marketlum.com"
    And a root channel exists with name "Old Channel"
    When I update the channel's name to "New Channel"
    Then the response status should be 200
    And the response should contain a channel with name "New Channel"

  Scenario: Successfully update purpose, color, and actorId
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Support Actor"
    And a root channel exists with name "My Channel"
    When I update the channel with purpose "Updated purpose" and color "#aabbcc" and actor "Support Actor"
    Then the response status should be 200
    And the response should contain a channel with purpose "Updated purpose"
    And the response should contain a channel with color "#aabbcc"
    And the response should contain a channel with an actor named "Support Actor"

  Scenario: Clear optional fields
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Old Actor"
    And a root channel exists with name "Full Channel" and purpose "Some purpose" and actor "Old Actor"
    When I update the channel to clear purpose and actor
    Then the response status should be 200
    And the response should contain a channel with null purpose
    And the response should contain a channel with null actor

  Scenario: Update a non-existent channel returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the channel with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404
