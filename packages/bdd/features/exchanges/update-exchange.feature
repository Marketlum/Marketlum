Feature: Update Exchange

  Scenario: Update exchange scalar fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Old Name"
    When I update the exchange's name to "New Name"
    Then the response status should be 200
    And the response should contain an exchange with name "New Name"

  Scenario: Update exchange relations
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a value stream exists with name "New Stream"
    And a channel exists with name "New Channel"
    And an exchange exists with name "Linked Exchange"
    When I update the exchange's valueStream and channel
    Then the response status should be 200
    And the response should contain a valueStream with name "New Stream"
    And the response should contain a channel with name "New Channel"

  Scenario: Replace exchange parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an agent exists with name "Agent C"
    And an exchange exists with name "Party Exchange"
    When I replace the exchange parties with "Agent B" and "Agent C"
    Then the response status should be 200
    And the response should contain 2 parties
    And the response should contain a party with agent "Agent B"
    And the response should contain a party with agent "Agent C"

  Scenario: Transition state from open to closed
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Open Exchange"
    When I update the exchange's state to "closed"
    Then the response status should be 200
    And the response should contain an exchange with state "closed"

  Scenario: Transition state from open to completed sets completedAt
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Open Exchange"
    When I update the exchange's state to "completed"
    Then the response status should be 200
    And the response should contain an exchange with state "completed"
    And the response should contain a completedAt timestamp

  Scenario: Transition state from closed to open (re-open)
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Closed Exchange" and state "closed"
    When I update the exchange's state to "open"
    Then the response status should be 200
    And the response should contain an exchange with state "open"

  Scenario: Reject transition from completed state (terminal)
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Done Exchange" and state "completed"
    When I update the exchange's state to "open"
    Then the response status should be 400

  Scenario: Reject transition from closed to completed
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Closed Exchange" and state "closed"
    When I update the exchange's state to "completed"
    Then the response status should be 400

  Scenario: Update a non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the exchange with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the exchange with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
