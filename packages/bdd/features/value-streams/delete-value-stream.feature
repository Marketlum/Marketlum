Feature: Delete Value Stream

  Scenario: Successfully delete a leaf value stream
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I delete the value stream
    Then the response status should be 204

  Scenario: Delete a value stream with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Warehousing    | Procurement    |
    When I delete the value stream "Supply Chain"
    Then the response status should be 204
    And the value stream "Procurement" should not exist
    And the value stream "Warehousing" should not exist

  Scenario: Delete a non-existent value stream returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the value stream with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the value stream with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
