Feature: Delete Tension

  Scenario: Delete tension
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Delete Actor"
    And a tension exists with name "Deletable Tension"
    When I delete the tension "Deletable Tension"
    Then the response status should be 204

  Scenario: Exchanges referencing deleted tension get null tensionId
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Exchange Actor A"
    And an actor exists with name "Exchange Actor B"
    And a tension exists with name "Linked Tension"
    And an exchange exists with name "Linked Exchange" referencing tension "Linked Tension"
    When I delete the tension "Linked Tension"
    Then the response status should be 204
    And the exchange "Linked Exchange" should have null tensionId

  Scenario: Delete non-existent tension returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete a tension with non-existent ID
    Then the response status should be 404
