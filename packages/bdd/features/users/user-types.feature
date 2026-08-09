Feature: User Types

  Scenario: Successfully create an agent user
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent user with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    Then the response status should be 201
    And the response should contain a user with type "agent"
    And the response should contain a user with email "pricing-bot@marketlum.com"

  Scenario: Creating an agent user with a password fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent user with name "Pricing Bot", email "pricing-bot@marketlum.com" and password "password123"
    Then the response status should be 400

  Scenario: Creating a human user without a password fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a human user with name "Alice" and email "alice@marketlum.com" and no password
    Then the response status should be 400

  Scenario: Users default to the human type
    Given I am authenticated as "admin@marketlum.com"
    When I create a user with:
      | name  | email               | password    |
      | Alice | alice@marketlum.com | password123 |
    Then the response status should be 201
    And the response should contain a user with type "human"

  Scenario: User type is immutable
    Given I am authenticated as "admin@marketlum.com"
    And an agent user exists with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    When I update the user's type to "human"
    Then the response status should be 400

  Scenario: Changing an agent user's password fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent user exists with name "Pricing Bot" and email "pricing-bot@marketlum.com"
    When I change the user's password to "password123"
    Then the response status should be 400
