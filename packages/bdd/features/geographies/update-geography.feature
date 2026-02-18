Feature: Update Geography

  Scenario: Successfully update a geography's name
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I update the geography's name to "Terra"
    Then the response status should be 200
    And the response should contain a geography with name "Terra"

  Scenario: Successfully update a geography's code
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    When I update the geography's code to "TERRA"
    Then the response status should be 200
    And the response should contain a geography with code "TERRA"

  Scenario: Duplicate code on update fails
    Given I am authenticated as "admin@marketlum.com"
    And a root planet exists with name "Earth" and code "EARTH"
    And a root planet exists with name "Mars" and code "MARS"
    When I update the geography "Mars" code to "EARTH"
    Then the response status should be 409

  Scenario: Update a non-existent geography returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the geography with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404
