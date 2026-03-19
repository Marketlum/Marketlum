Feature: Transition Exchange

  Scenario: Close an open exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Open Exchange"
    When I transition the exchange with action "close"
    Then the response status should be 200
    And the response should contain an exchange with state "closed"

  Scenario: Complete an open exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Open Exchange"
    When I transition the exchange with action "complete"
    Then the response status should be 200
    And the response should contain an exchange with state "completed"
    And the response should contain a completedAt timestamp

  Scenario: Reopen a closed exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Closed Exchange" and state "closed"
    When I transition the exchange with action "reopen"
    Then the response status should be 200
    And the response should contain an exchange with state "open"

  Scenario: Reject transition from completed state
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Done Exchange" and state "completed"
    When I transition the exchange with action "reopen"
    Then the response status should be 400

  Scenario: Reject transition from closed to completed
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Closed Exchange" and state "closed"
    When I transition the exchange with action "complete"
    Then the response status should be 400

  Scenario: Non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I transition the exchange with ID "00000000-0000-0000-0000-000000000000" with action "close"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I transition the exchange with ID "00000000-0000-0000-0000-000000000000" with action "close"
    Then the response status should be 401
