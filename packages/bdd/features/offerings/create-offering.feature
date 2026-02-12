Feature: Create Offering

  Scenario: Create offering with all fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Acme Corp"
    And a value stream exists with name "Main Stream"
    When I create an offering with:
      | name           | purpose       | description      | link                     | state | activeFrom               | activeUntil              |
      | Premium Plan   | Enterprise    | Full access plan | https://example.com/plan | live  | 2025-01-01T00:00:00.000Z | 2025-12-31T23:59:59.000Z |
    Then the response status should be 201
    And the response should contain an offering with name "Premium Plan"
    And the response should contain an offering with state "live"
    And the response should contain a valueStream with name "Main Stream"
    And the response should contain an agent with name "Acme Corp"

  Scenario: Create offering with minimal fields
    Given I am authenticated as "admin@marketlum.com"
    When I create an offering with name "Basic Plan"
    Then the response status should be 201
    And the response should contain an offering with name "Basic Plan"
    And the response should contain an offering with state "draft"

  Scenario: Create offering with components
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Widget A"
    And a value exists with name "Widget B"
    When I create an offering with components:
      | name              |
      | Component Bundle  |
    Then the response status should be 201
    And the response should contain an offering with name "Component Bundle"
    And the response should contain 2 components
    And the components should reference the created values

  Scenario: Create offering with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an offering with empty name
    Then the response status should be 400

  Scenario: Create offering with non-existent valueStreamId fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an offering with non-existent valueStreamId
    Then the response status should be 404

  Scenario: Create offering with non-existent agentId fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an offering with non-existent agentId
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create an offering without authentication
    Then the response status should be 401
