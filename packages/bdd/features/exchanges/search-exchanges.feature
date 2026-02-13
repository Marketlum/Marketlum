Feature: Search Exchanges

  Scenario: Search exchanges with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Alpha Exchange"
    And an exchange exists with name "Beta Exchange"
    And an exchange exists with name "Gamma Exchange"
    When I search exchanges
    Then the response status should be 200
    And the response should contain 3 exchanges

  Scenario: Search exchanges by text filter
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Alpha Exchange" and purpose "Trading goods"
    And an exchange exists with name "Beta Exchange" and purpose "Service delivery"
    And an exchange exists with name "Gamma Exchange" and purpose "Trading services"
    When I search exchanges with text "Alpha"
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Filter exchanges by state
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Open Exchange" and state "open"
    And an exchange exists with name "Closed Exchange" and state "closed"
    When I search exchanges with state "open"
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Filter exchanges by channelId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a channel exists with name "Online"
    And an exchange exists with name "Online Exchange" and channel "Online"
    And an exchange exists with name "Other Exchange"
    When I search exchanges with channelId filter
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Filter exchanges by valueStreamId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a value stream exists with name "Commerce"
    And an exchange exists with name "Commerce Exchange" and valueStream "Commerce"
    And an exchange exists with name "Other Exchange"
    When I search exchanges with valueStreamId filter
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Filter exchanges by partyAgentId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an agent exists with name "Agent C"
    And an exchange exists with name "AB Exchange" with parties "Agent A" and "Agent B"
    And an exchange exists with name "BC Exchange" with parties "Agent B" and "Agent C"
    When I search exchanges with partyAgentId for "Agent A"
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Filter exchanges by leadUserId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a user exists with name "Lead User"
    And an exchange exists with name "Led Exchange" and lead "Lead User"
    And an exchange exists with name "Other Exchange"
    When I search exchanges with leadUserId filter
    Then the response status should be 200
    And the response should contain 1 exchange

  Scenario: Sort exchanges by name ascending
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Zeta Exchange"
    And an exchange exists with name "Alpha Exchange"
    When I search exchanges sorted by name ascending
    Then the response status should be 200
    And the first exchange should have name "Alpha Exchange"

  Scenario: Default sort by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "First Exchange"
    And an exchange exists with name "Second Exchange"
    When I search exchanges
    Then the response status should be 200
    And the first exchange should have name "Second Exchange"
