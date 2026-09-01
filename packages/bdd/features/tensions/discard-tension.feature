Feature: Discard Tension

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

  Scenario: Discarding removes the projection row but keeps the stream
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Stream Actor"
    And a tension exists with name "Discarded Tension"
    When I delete the tension "Discarded Tension"
    Then the response status should be 204
    And the tension "Discarded Tension" should have a TensionDiscarded event in its stream

  Scenario: Unauthenticated discard is rejected
    When I delete a tension with non-existent ID without authentication
    Then the response status should be 401
