Feature: Update agent address

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists
    And a country "Germany" with code "DE" exists
    And "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1" marked primary
    And "Acme Corp" has an address "Berlin" in "Germany" with line1 "Friedrichstr. 1"

  Scenario: Update address fields
    When I update the "Berlin" address of "Acme Corp" with:
      | label             |
      | Berlin Office     |
    Then the response status should be 200
    And the response should contain an address with label "Berlin Office"

  Scenario: Set a non-primary address as primary clears the sibling flag
    When I update the "Berlin" address of "Acme Corp" with:
      | isPrimary |
      | true      |
    Then the response status should be 200
    And the "Berlin" address of "Acme Corp" should be primary
    And the "HQ" address of "Acme Corp" should not be primary

  Scenario: Update with invalid country fails
    Given a continent "Europe" with code "EU" exists
    When I update the "Berlin" address of "Acme Corp" with country "Europe"
    Then the response status should be 400

  Scenario: Update a nonexistent address returns 404
    When I update a nonexistent address of "Acme Corp" with:
      | label |
      | nope  |
    Then the response status should be 404
