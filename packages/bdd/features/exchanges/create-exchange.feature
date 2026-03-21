Feature: Create Exchange

  Scenario: Create exchange with all fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value stream exists with name "Commerce"
    And a channel exists with name "Online Store"
    And a user exists with name "John Lead"
    When I create an exchange with:
      | name          | purpose         | description       | link                    |
      | Trade Deal    | Goods exchange  | A trade of goods  | https://example.com/doc |
    Then the response status should be 201
    And the response should contain an exchange with name "Trade Deal"
    And the response should contain an exchange with purpose "Goods exchange"
    And the response should contain an exchange with state "open"
    And the response should contain an openedAt timestamp
    And the response should contain 2 parties
    And the response should contain a valueStream with name "Commerce"
    And the response should contain a channel with name "Online Store"
    And the response should contain a lead with name "John Lead"

  Scenario: State defaults to open with openedAt set automatically
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    When I create a minimal exchange with name "Simple Exchange"
    Then the response status should be 201
    And the response should contain an exchange with state "open"
    And the response should contain an openedAt timestamp
    And the response completedAt should be null

  Scenario: Reject fewer than 2 parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Solo Agent"
    When I create an exchange with 1 party
    Then the response status should be 400

  Scenario: Reject missing required fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    When I create an exchange with empty name
    Then the response status should be 400

  Scenario: Reject non-existent agent in parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Real Agent"
    When I create an exchange with a non-existent party agent
    Then the response status should be 404

  Scenario: Reject non-existent valueStream reference
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    When I create an exchange with a non-existent valueStream
    Then the response status should be 404

  Scenario: Reject duplicate agent in parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    When I create an exchange with duplicate agent in parties
    Then the response status should be 400

  Scenario: Create exchange with parties without roles
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    When I create an exchange with parties without roles and:
      | name           | purpose          |
      | Roleless Deal  | No roles needed  |
    Then the response status should be 201
    And the response should contain an exchange with name "Roleless Deal"
    And the response should contain 2 parties
    And the response parties should have null roles

  Scenario: Create exchange with pipeline
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And a pipeline exists with name "Sales Pipeline" and color "#3b82f6"
    When I create an exchange with pipeline "Sales Pipeline" and:
      | name           | purpose          |
      | Pipeline Deal  | Pipeline test    |
    Then the response status should be 201
    And the response should contain an exchange with name "Pipeline Deal"
    And the response should contain a pipeline with name "Sales Pipeline"

  Scenario: Unauthenticated request is rejected
    When I create an exchange without authentication
    Then the response status should be 401
