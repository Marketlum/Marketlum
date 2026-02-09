Feature: Create Taxonomy

  Scenario: Successfully create a root taxonomy
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with:
      | name        | description          | link                          |
      | Electronics | Electronic products  | https://example.com/electronics |
    Then the response status should be 201
    And the response should contain a taxonomy with name "Electronics"
    And the response should contain a taxonomy with description "Electronic products"
    And the response should contain a taxonomy with link "https://example.com/electronics"

  Scenario: Successfully create a child taxonomy
    Given I am authenticated as "admin@marketlum.com"
    And a root taxonomy exists with name "Electronics"
    When I create a taxonomy with parent "Electronics":
      | name    | description      | link                        |
      | Laptops | Laptop computers | https://example.com/laptops |
    Then the response status should be 201
    And the response should contain a taxonomy with name "Laptops"
    And the response should contain a taxonomy with link "https://example.com/laptops"

  Scenario: Creating a taxonomy with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with:
      | name | description | link |
      |      |             |      |
    Then the response status should be 400

  Scenario: Creating a taxonomy with an invalid link fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with:
      | name        | description         | link       |
      | Electronics | Electronic products | not-a-url  |
    Then the response status should be 400

  Scenario: Creating a taxonomy with non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a taxonomy with non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create a taxonomy with:
      | name        | description          | link                          |
      | Electronics | Electronic products  | https://example.com/electronics |
    Then the response status should be 401
