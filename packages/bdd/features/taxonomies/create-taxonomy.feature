Feature: Create Taxonomy

  Scenario: Successfully create a root taxonomy
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with:
      | name        | description          |
      | Electronics | Electronic products  |
    Then the response status should be 201
    And the response should contain a taxonomy with name "Electronics"
    And the response should contain a taxonomy with description "Electronic products"

  Scenario: Successfully create a child taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I create a taxonomy with parent "Electronics":
      | name    | description |
      | Laptops | Laptop computers |
    Then the response status should be 201
    And the response should contain a taxonomy with name "Laptops"

  Scenario: Creating a taxonomy with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with:
      | name | description |
      |      |             |
    Then the response status should be 400

  Scenario: Creating a taxonomy with non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create a taxonomy with:
      | name        | description          |
      | Electronics | Electronic products  |
    Then the response status should be 401
