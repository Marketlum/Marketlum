Feature: Search Agreements

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement      | Master Agreement   |
      | Trade Deal         |                    |
    When I request the list of agreements
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search by title
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Trade Agreement    |                    |
      | Trade Deal         |                    |
    When I request the list of agreements with search "Agreement"
    Then the response status should be 200
    And the total count should be 2
    And all returned agreements should have "Agreement" in their title or content

  Scenario: Unauthenticated request is rejected
    When I request the list of agreements
    Then the response status should be 401
