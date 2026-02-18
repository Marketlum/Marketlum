Feature: Delete Geography

  Scenario: Successfully delete a leaf geography
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I delete the geography
    Then the response status should be 204

  Scenario: Delete a geography with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And the following geography tree exists:
      | name           | code           | type                 | parent         |
      | Earth          | EARTH          | planet               |                |
      | Europe         | EUROPE         | continent            | Earth          |
      | Western Europe | WESTERN_EUROPE | continental_section  | Europe         |
    When I delete the geography "Earth"
    Then the response status should be 204
    And the geography "Europe" should not exist
    And the geography "Western Europe" should not exist

  Scenario: Delete a non-existent geography returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the geography with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
