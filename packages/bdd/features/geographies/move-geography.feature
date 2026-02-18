Feature: Move Geography

  Scenario: Move a geography to a valid parent
    Given I am authenticated as "admin@marketlum.com"
    And the following geography tree exists:
      | name           | code           | type                 | parent         |
      | Earth          | EARTH          | planet               |                |
      | Europe         | EUROPE         | continent            | Earth          |
      | Asia           | ASIA           | continent            | Earth          |
      | Western Europe | WESTERN_EUROPE | continental_section  | Europe         |
    When I move "Western Europe" to parent "Asia"
    Then the response status should be 200
    And the children of "Asia" should include "Western Europe"

  Scenario: Moving a non-planet geography to root fails
    Given I am authenticated as "admin@marketlum.com"
    And the following geography tree exists:
      | name           | code           | type                 | parent         |
      | Earth          | EARTH          | planet               |                |
      | Europe         | EUROPE         | continent            | Earth          |
    When I move "Europe" to root
    Then the response status should be 400

  Scenario: Moving to a parent with wrong type fails
    Given I am authenticated as "admin@marketlum.com"
    And the following geography tree exists:
      | name           | code           | type                 | parent         |
      | Earth          | EARTH          | planet               |                |
      | Europe         | EUROPE         | continent            | Earth          |
      | Western Europe | WESTERN_EUROPE | continental_section  | Europe         |
      | Poland         | POLAND         | country              | Western Europe |
    When I move "Poland" to parent "Earth"
    Then the response status should be 400

  Scenario: Move a non-existent geography returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I move geography with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 404
