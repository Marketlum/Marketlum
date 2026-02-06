Feature: List Users

  Scenario: List users with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following users exist:
      | name    | email                 | password    |
      | Alice   | alice@marketlum.com    | password123 |
      | Bob     | bob@marketlum.com      | password123 |
      | Charlie | charlie@marketlum.com  | password123 |
    When I request the list of users
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be at least 4

  Scenario: Search users by name
    Given I am authenticated as "admin@marketlum.com"
    And the following users exist:
      | name    | email                 | password    |
      | Alice   | alice@marketlum.com    | password123 |
      | Bob     | bob@marketlum.com      | password123 |
    When I request the list of users with search "Alice"
    Then the response status should be 200
    And all returned users should have "Alice" in their name or email

  Scenario: Paginate users
    Given I am authenticated as "admin@marketlum.com"
    And the following users exist:
      | name    | email                 | password    |
      | Alice   | alice@marketlum.com    | password123 |
      | Bob     | bob@marketlum.com      | password123 |
    When I request the list of users with page 1 and limit 1
    Then the response status should be 200
    And the response should contain 1 user

  Scenario: Unauthenticated request is rejected
    When I request the list of users
    Then the response status should be 401
