Feature: Get Taxonomy Tree

  Scenario: Get the full taxonomy tree
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Phones      | Electronics |
      | Clothing    |             |
    When I request the full taxonomy tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Electronics" should have 2 children

  Scenario: Get root taxonomies only
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Clothing    |             |
    When I request the root taxonomies
    Then the response status should be 200
    And the response should contain 2 taxonomies

  Scenario: Get direct children of a taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Phones      | Electronics |
      | Gaming      | Laptops     |
    When I request the children of "Electronics"
    Then the response status should be 200
    And the response should contain 2 taxonomies

  Scenario: Get descendants tree of a taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Gaming      | Laptops     |
    When I request the descendants tree of "Electronics"
    Then the response status should be 200
    And the descendants tree should contain child "Laptops"

  Scenario: Unauthenticated request is rejected
    When I request the full taxonomy tree
    Then the response status should be 401
