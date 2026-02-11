Feature: Export Data

  Scenario: Export all values with high limit returns all records
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name       | type    | purpose         |
      | Value One  | product | First product   |
      | Value Two  | service | First service   |
      | Value Three| product | Second product  |
    When I request the list of values with limit 10000
    Then the response status should be 200
    And the response should contain 3 values

  Scenario: Export all values with filters applies filters correctly
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name       | type    | purpose         |
      | Value One  | product | First product   |
      | Value Two  | service | First service   |
      | Value Three| product | Second product  |
    When I request the list of values with limit 10000 and type "product"
    Then the response status should be 200
    And the response should contain 2 values

  Scenario: Export all agents with high limit
    Given I am authenticated as "admin@marketlum.com"
    And the following agents exist:
      | name        | type         | purpose         |
      | Agent One   | organization | First org       |
      | Agent Two   | individual   | First individual|
      | Agent Three | virtual      | First virtual   |
    When I request the list of agents with limit 10000
    Then the response status should be 200
    And the response should contain 3 agents

  Scenario: Export all users with high limit
    Given I am authenticated as "admin@marketlum.com"
    And the following users exist:
      | name      | email              | password    |
      | User One  | user1@example.com  | password123 |
      | User Two  | user2@example.com  | password123 |
    When I request the list of users with limit 10000
    Then the response status should be 200
    And the response should contain 3 users

  Scenario: Export values with search filter
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name         | type    | purpose          |
      | Alpha Widget | product | A widget         |
      | Beta Service | service | A service        |
      | Alpha Tool   | product | A tool           |
    When I request the list of values with limit 10000 and search "Alpha"
    Then the response status should be 200
    And the response should contain 2 values

  Scenario: Export values with sort
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name    | type    | purpose |
      | Charlie | product | C       |
      | Alpha   | product | A       |
      | Bravo   | product | B       |
    When I request the list of values with limit 10000 sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first returned value should have name "Alpha"

  Scenario: Default limit still works
    Given I am authenticated as "admin@marketlum.com"
    And the following values exist:
      | name         | type    | purpose |
      | Value One    | product | P1      |
      | Value Two    | product | P2      |
      | Value Three  | product | P3      |
      | Value Four   | product | P4      |
      | Value Five   | product | P5      |
      | Value Six    | product | P6      |
      | Value Seven  | product | P7      |
      | Value Eight  | product | P8      |
      | Value Nine   | product | P9      |
      | Value Ten    | product | P10     |
      | Value Eleven | product | P11     |
    When I request the list of values with limit 10
    Then the response status should be 200
    And the response should contain 10 values

  Scenario: Unauthenticated export is rejected
    When I request the list of values with limit 10000
    Then the response status should be 401
