Feature: Move Value Stream

  Scenario: Move a value stream to a different parent
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Distribution   |                |
      | Procurement    | Supply Chain   |
    When I move "Procurement" to parent "Distribution"
    Then the response status should be 200
    And the children of "Distribution" should include "Procurement"

  Scenario: Move a value stream to root
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
    When I move "Procurement" to root
    Then the response status should be 200
    And the root value streams should include "Procurement"

  Scenario: Move to a non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I move "Supply Chain" to non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I move value stream with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 401
