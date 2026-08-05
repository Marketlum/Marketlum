Feature: Delete agent address

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists
    And a country "Germany" with code "DE" exists

  Scenario: Delete a non-primary address
    Given "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1" marked primary
    And "Acme Corp" has an address "Berlin" in "Germany" with line1 "Friedrichstr. 1"
    When I delete the "Berlin" address of "Acme Corp"
    Then the response status should be 204
    And listing addresses of "Acme Corp" returns 1 address

  Scenario: Deleting the primary auto-promotes the most recent sibling at read time
    Given "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1" marked primary
    And "Acme Corp" has an address "Berlin" in "Germany" with line1 "Friedrichstr. 1"
    When I delete the "HQ" address of "Acme Corp"
    And I list addresses of "Acme Corp"
    Then the response status should be 200
    And the first address should be "Berlin"
    And the first address should be primary
