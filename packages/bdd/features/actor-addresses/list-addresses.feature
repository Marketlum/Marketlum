Feature: List agent addresses

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists
    And a country "Germany" with code "DE" exists

  Scenario: An agent with no addresses
    When I list addresses of "Acme Corp"
    Then the response status should be 200
    And the response should contain 0 addresses

  Scenario: An agent with a single address
    Given "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1"
    When I list addresses of "Acme Corp"
    Then the response status should be 200
    And the response should contain 1 address
    And the first address should be primary

  Scenario: Multiple addresses are ordered with the primary first
    Given "Acme Corp" has an address "Berlin" in "Germany" with line1 "Friedrichstr. 1"
    And "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1" marked primary
    When I list addresses of "Acme Corp"
    Then the response status should be 200
    And the response should contain 2 addresses
    And the first address should be "HQ"
