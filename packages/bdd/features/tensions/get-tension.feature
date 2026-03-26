Feature: Get Tension

  Scenario: Get tension by ID with all relations
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Detail Agent"
    And a user exists with name "Detail Lead"
    And a tension exists with name "Detail Tension" with lead "Detail Lead"
    When I get the tension "Detail Tension"
    Then the response status should be 200
    And the response should contain a tension with name "Detail Tension"
    And the response should contain an agent with name "Detail Agent"
    And the response should contain a lead with name "Detail Lead"

  Scenario: Get non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I get a tension with non-existent ID
    Then the response status should be 404
