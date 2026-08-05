Feature: Cascade deletion of addresses when an agent is removed

  Scenario: Deleting an agent removes its addresses
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists
    And "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1"
    When I delete the agent "Acme Corp"
    Then the response status should be 204
    And no address rows remain in the database
