Feature: Actor endpoints embed addresses

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an actor "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists
    And "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1"

  Scenario: GET /actors/:id embeds the sorted addresses
    When I fetch the actor "Acme Corp"
    Then the response status should be 200
    And the actor should have 1 embedded address
    And the first embedded address country code should be "PL"

  Scenario: GET /actors list also embeds addresses
    When I list actors
    Then the response status should be 200
    And the "Acme Corp" entry should embed 1 address
