Feature: Create agent address

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme Corp" of type "organization" exists
    And a country "Poland" with code "PL" exists

  Scenario: Successfully add an address to an agent
    When I add an address to "Acme Corp" with:
      | label | line1                | line2 | city     | region | postalCode | country | isPrimary |
      | HQ    | ul. Marszałkowska 1  |       | Warszawa |        | 00-001     | Poland  | true      |
    Then the response status should be 201
    And the response should contain an address with line1 "ul. Marszałkowska 1"
    And the response should contain an address with isPrimary true
    And the response should contain an address whose country code is "PL"

  Scenario: Address creation fails when line1 is missing
    When I add an address to "Acme Corp" with:
      | label | line1 | line2 | city     | region | postalCode | country |
      | HQ    |       |       | Warszawa |        | 00-001     | Poland  |
    Then the response status should be 400

  Scenario: Address creation fails when the agent does not exist
    When I add an address to a nonexistent agent with:
      | line1               | city     | postalCode | country |
      | ul. Marszałkowska 1 | Warszawa | 00-001     | Poland  |
    Then the response status should be 404

  Scenario: Address creation rejects a non-country geography
    Given a continent "Europe" with code "EU" exists
    When I add an address to "Acme Corp" using "Europe" as country with:
      | line1               | city     | postalCode |
      | ul. Marszałkowska 1 | Warszawa | 00-001     |
    Then the response status should be 400
