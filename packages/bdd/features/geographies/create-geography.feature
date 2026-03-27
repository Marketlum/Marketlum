Feature: Create Geography

  Scenario: Successfully create a root planet
    Given I am authenticated as "admin@marketlum.com"
    When I create a geography with:
      | name  | code  | type   |
      | Earth | EARTH | planet |
    Then the response status should be 201
    And the response should contain a geography with name "Earth"
    And the response should contain a geography with code "EARTH"
    And the response should contain a geography with type "planet"

  Scenario: Successfully create a child continent under planet
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I create a child geography under "Earth" with:
      | name   | code   | type      |
      | Europe | EUROPE | continent |
    Then the response status should be 201
    And the response should contain a geography with name "Europe"
    And the response should contain a geography with type "continent"

  Scenario: Creating a root geography with non-planet type fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a geography with:
      | name      | code      | type      |
      | Europe    | EUROPE    | continent |
    Then the response status should be 400

  Scenario: Successfully create a child by skipping levels
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    And a child geography "Europe" with code "EUROPE" and type "continent" exists under "Earth"
    When I create a child geography under "Europe" with:
      | name   | code   | type    |
      | Poland | POLAND | country |
    Then the response status should be 201
    And the response should contain a geography with name "Poland"
    And the response should contain a geography with type "country"

  Scenario: Creating a child with a higher-level type fails
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    And a child geography "Europe" with code "EUROPE" and type "continent" exists under "Earth"
    And a child geography "Poland" with code "POLAND" and type "country" exists under "Europe"
    When I create a child geography under "Poland" with:
      | name   | code   | type      |
      | Europe2 | EUROPE2 | continent |
    Then the response status should be 400

  Scenario: Creating a geography with duplicate code fails
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I create a geography with:
      | name     | code  | type   |
      | Earth 2  | EARTH | planet |
    Then the response status should be 409

  Scenario: Creating a geography without name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a geography without name
    Then the response status should be 400

  Scenario: Creating a geography without code fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a geography without code
    Then the response status should be 400

  Scenario: Creating a geography without type fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a geography without type
    Then the response status should be 400

  Scenario: Unauthenticated user cannot create a geography
    When I create a geography without authentication
    Then the response status should be 401
