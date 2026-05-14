Feature: Filter and search geographies

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And the following geographies exist:
      | name      | code | type    | parent |
      | Earth     | EARTH| planet  |        |
      | Europe    | EU   | continent | Earth |
      | Poland    | PL   | country | Europe |
      | Germany   | DE   | country | Europe |

  Scenario: Filter geographies by type
    When I list geographies with type "country"
    Then the response status should be 200
    And the response should contain 2 geographies
    And every geography should have type "country"

  Scenario: Search geographies by name
    When I list geographies with type "country" and search "Pol"
    Then the response status should be 200
    And the response should contain 1 geography
    And the first geography should have code "PL"
