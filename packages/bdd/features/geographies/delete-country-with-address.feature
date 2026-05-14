Feature: Deleting a country referenced by an address is blocked

  Scenario: Cannot delete a country referenced by an agent's address
    Given I am authenticated as "admin@marketlum.com"
    And the following geographies exist:
      | name    | code | type    | parent |
      | Earth   | EARTH| planet  |        |
      | Europe  | EU   | continent | Earth |
      | Poland  | PL   | country | Europe |
    And an agent "Acme Corp" of type "organization" exists
    And "Acme Corp" has an address "HQ" in "Poland" with line1 "ul. Marszałkowska 1"
    When I delete the geography "Poland"
    Then the response status should be 409
