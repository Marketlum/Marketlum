Feature: Read Geography

  Scenario: Get a geography by ID
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I request the geography by its ID
    Then the response status should be 200
    And the response should contain a geography with name "Earth"

  Scenario: Get the geography tree with hierarchy
    Given I am authenticated as "admin@marketlum.com"
    And the following geography tree exists:
      | name           | code           | type                 | parent         |
      | Earth          | EARTH          | planet               |                |
      | Europe         | EUROPE         | continent            | Earth          |
      | Western Europe | WESTERN_EUROPE | continental_section  | Europe         |
      | Mars           | MARS           | planet               |                |
    When I request the full geography tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Earth" should have 1 children

  Scenario: Get a non-existent geography returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request a geography with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
