Feature: Search Taxonomies

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Phones      | Electronics |
      | Clothing    |             |
      | Shirts      | Clothing    |
      | Pants       | Clothing    |
    When I request the list of taxonomies
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 6

  Scenario: Search by name
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name           | parent      |
      | Electronics    |             |
      | Laptops        | Electronics |
      | Gaming Laptops | Laptops     |
      | Phones         | Electronics |
    When I request the list of taxonomies with search "Laptop"
    Then the response status should be 200
    And the total count should be 2
    And all returned taxonomies should have "Laptop" in their name or description

  Scenario: Search by description
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists with descriptions:
      | name        | parent      | description          |
      | Electronics |             | Electronic devices   |
      | Laptops     | Electronics | Portable devices     |
      | Phones      | Electronics | Mobile communication |
    When I request the list of taxonomies with search "devices"
    Then the response status should be 200
    And the total count should be 2
    And all returned taxonomies should have "devices" in their name or description

  Scenario: Paginate results
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name        | parent      |
      | Electronics |             |
      | Laptops     | Electronics |
      | Phones      | Electronics |
    When I request the list of taxonomies with page 1 and limit 2
    Then the response status should be 200
    And the response should contain 2 taxonomies

  Scenario: Sort results
    Given I am authenticated as "admin@marketlum.com"
    And the following taxonomy tree exists:
      | name   | parent |
      | Zebra  |        |
      | Apple  |        |
      | Mango  |        |
    When I request the list of taxonomies sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first taxonomy should have name "Apple"

  Scenario: Unauthenticated request is rejected
    When I request the list of taxonomies
    Then the response status should be 401
