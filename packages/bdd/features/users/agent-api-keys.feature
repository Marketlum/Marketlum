Feature: Admin-managed API keys for agent users

  Scenario: Admin creates an API key for an agent user
    Given I am authenticated as "admin@marketlum.com"
    And an agent user exists with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    When I create an API key named "bot-key" for the agent user
    Then the response status should be 201
    And the response should contain the plaintext API key exactly once

  Scenario: Creating an API key for a human user fails
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with email "alice@marketlum.com" and password "password123"
    When I create an API key named "human-key" for that human user
    Then the response status should be 400

  Scenario: Admin lists an agent's API keys
    Given I am authenticated as "admin@marketlum.com"
    And an agent user exists with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    And the agent user has an API key named "bot-key"
    When I list the agent user's API keys
    Then the response status should be 200
    And the key list contains "bot-key" with metadata only

  Scenario: Admin revokes an agent's API key
    Given I am authenticated as "admin@marketlum.com"
    And an agent user exists with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    And the agent user has an API key named "bot-key"
    When I revoke that API key
    Then the response status should be 204
    And the agent user has no API keys

  Scenario: A non-admin cannot manage agent API keys
    Given a user without user permissions is authenticated
    And an agent user exists in the system
    When I create an API key named "sneaky-key" for the agent user
    Then the response status should be 403
