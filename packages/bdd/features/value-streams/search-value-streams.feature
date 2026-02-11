Feature: Search Value Streams

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name           | parent         |
      | Supply Chain   |                |
      | Procurement    | Supply Chain   |
      | Logistics      | Supply Chain   |
      | Distribution   |                |
    When I request the list of value streams
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 4

  Scenario: Search by name
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name              | parent         |
      | Supply Chain      |                |
      | Supply Management | Supply Chain   |
      | Distribution      |                |
    When I request the list of value streams with search "Supply"
    Then the response status should be 200
    And the total count should be 2
    And all returned value streams should have "Supply" in their name or purpose

  Scenario: Search by purpose
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists with purposes:
      | name           | parent | purpose              |
      | Supply Chain   |        | Managing logistics   |
      | Distribution   |        | Delivering products  |
      | Procurement    |        | Managing purchases   |
    When I request the list of value streams with search "Managing"
    Then the response status should be 200
    And the total count should be 2
    And all returned value streams should have "Managing" in their name or purpose

  Scenario: Sort results
    Given I am authenticated as "admin@marketlum.com"
    And the following value stream tree exists:
      | name   | parent |
      | Zebra  |        |
      | Apple  |        |
      | Mango  |        |
    When I request the list of value streams sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first value stream should have name "Apple"

  Scenario: Unauthenticated request is rejected
    When I request the list of value streams
    Then the response status should be 401
