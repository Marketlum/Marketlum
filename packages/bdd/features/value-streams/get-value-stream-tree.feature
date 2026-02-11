Feature: Get Value Stream Tree

  Scenario: Get the full value stream tree
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Logistics      | Supply Chain   |
      | Distribution   |                |
    When I request the full value stream tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Supply Chain" should have 2 children

  Scenario: Get root value streams only
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Distribution   |                |
    When I request the root value streams
    Then the response status should be 200
    And the response should contain 2 value streams

  Scenario: Get direct children of a value stream
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Logistics      | Supply Chain   |
      | Warehousing    | Procurement    |
    When I request the children of "Supply Chain"
    Then the response status should be 200
    And the response should contain 2 value streams

  Scenario: Get descendants tree of a value stream
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Warehousing    | Procurement    |
    When I request the descendants tree of "Supply Chain"
    Then the response status should be 200
    And the descendants tree should contain child "Procurement"

  Scenario: Unauthenticated request is rejected
    When I request the full value stream tree
    Then the response status should be 401
