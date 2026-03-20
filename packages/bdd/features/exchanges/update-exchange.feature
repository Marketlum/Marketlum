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

  Scenario: Set and clear exchange pipeline
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a pipeline exists with name "Sales Pipeline" and color "#3b82f6"
    And an exchange exists with name "Pipeline Exchange"
    When I update the exchange's pipeline to "Sales Pipeline"
    Then the response status should be 200
    And the response should contain a pipeline with name "Sales Pipeline"
    When I clear the exchange's pipeline
    Then the response status should be 200
    And the response pipeline should be null

  Scenario: Update a non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the exchange with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the exchange with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
