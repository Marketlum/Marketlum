Feature: Move Taxonomy

  Scenario: Move a taxonomy to a different parent
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Clothing    |             |
      | Laptops     | Electronics |
    When I move "Laptops" to parent "Clothing"
    Then the response status should be 200
    And the children of "Clothing" should include "Laptops"

  Scenario: Move a taxonomy to root
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
    When I move "Laptops" to root
    Then the response status should be 200
    And the root taxonomies should include "Laptops"

  Scenario: Move to a non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I move "Electronics" to non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I move taxonomy with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 401
