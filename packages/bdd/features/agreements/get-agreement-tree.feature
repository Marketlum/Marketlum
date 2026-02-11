Feature: Get Agreement Tree

  Scenario: Get the full agreement tree
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement A    | Master Agreement   |
      | Sub Agreement B    | Master Agreement   |
      | Standalone         |                    |
    When I request the full agreement tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Master Agreement" should have 2 children

  Scenario: Get root agreements only
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement      | Master Agreement   |
      | Standalone         |                    |
    When I request the root agreements
    Then the response status should be 200
    And the response should contain 2 agreements

  Scenario: Get direct children of an agreement
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement A    | Master Agreement   |
      | Sub Agreement B    | Master Agreement   |
      | Deep Sub           | Sub Agreement A    |
    When I request the children of "Master Agreement"
    Then the response status should be 200
    And the response should contain 2 agreements

  Scenario: Get descendants tree of an agreement
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement      | Master Agreement   |
      | Deep Sub           | Sub Agreement      |
    When I request the descendants tree of "Master Agreement"
    Then the response status should be 200
    And the descendants tree should contain child "Sub Agreement"

  Scenario: Unauthenticated request is rejected
    When I request the full agreement tree
    Then the response status should be 401
