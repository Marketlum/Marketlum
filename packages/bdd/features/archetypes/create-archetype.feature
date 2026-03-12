Feature: Create Archetype

  Scenario: Create archetype with all fields
    Given I am authenticated as "admin@marketlum.com"
    When I create an archetype with:
      | name           | purpose              | description              |
      | Market Maker   | Facilitate trading   | Agents that make markets |
    Then the response status should be 201
    And the response should contain an archetype with name "Market Maker"
    And the response should contain an archetype with purpose "Facilitate trading"
    And the response should contain an archetype with description "Agents that make markets"

  Scenario: Create archetype with only name
    Given I am authenticated as "admin@marketlum.com"
    When I create an archetype with:
      | name         |
      | Basic Type   |
    Then the response status should be 201
    And the response should contain an archetype with name "Basic Type"

  Scenario: Create archetype with taxonomies
    Given I am authenticated as "admin@marketlum.com"
    And a taxonomy exists with name "Industry"
    And a taxonomy exists with name "Region"
    When I create an archetype with taxonomies "Industry,Region" and:
      | name              |
      | Classified Agent  |
    Then the response status should be 201
    And the response should contain an archetype with name "Classified Agent"
    And the response should contain 2 taxonomies

  Scenario: Create archetype with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an archetype with empty name
    Then the response status should be 400

  Scenario: Create archetype with duplicate name fails
    Given I am authenticated as "admin@marketlum.com"
    And an archetype exists with name "Unique Type"
    When I create an archetype with:
      | name         |
      | Unique Type  |
    Then the response status should be 409

  Scenario: Create archetype with non-existent taxonomy fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an archetype with non-existent taxonomy
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create an archetype without authentication
    Then the response status should be 401
