Feature: Delete Taxonomy

  Scenario: Successfully delete a leaf taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I delete the taxonomy
    Then the response status should be 204

  Scenario: Delete a taxonomy with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Gaming      | Laptops     |
    When I delete the taxonomy "Electronics"
    Then the response status should be 204
    And the taxonomy "Laptops" should not exist
    And the taxonomy "Gaming" should not exist

  Scenario: Delete a non-existent taxonomy returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the taxonomy with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the taxonomy with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
