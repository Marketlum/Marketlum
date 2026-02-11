Feature: Assign Images to Values

  Scenario: Create value with images
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "photo1.png"
    And a file exists with name "photo2.png"
    When I create a value with images "photo1.png,photo2.png" and:
      | name      | type    | purpose      |
      | Value One | product | Has images   |
    Then the response status should be 201
    And the response should include images "photo1.png,photo2.png" in order

  Scenario: Create value with non-existent image
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent image and:
      | name      | type    | purpose        |
      | Value Two | product | Bad image ref  |
    Then the response status should be 404

  Scenario: Update value's images
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "photo1.png"
    And a file exists with name "photo2.png"
    And a value exists with name "Value Three" and type "product" and images "photo1.png"
    When I update the value's images to "photo2.png,photo1.png"
    Then the response status should be 200
    And the response should include images "photo2.png,photo1.png" in order

  Scenario: Remove value's images
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "photo1.png"
    And a value exists with name "Value Four" and type "product" and images "photo1.png"
    When I update the value's images to empty
    Then the response status should be 200
    And the response should have empty images

  Scenario: Get value by ID includes images
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "photo1.png"
    And a value exists with name "Value Five" and type "product" and images "photo1.png"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include images "photo1.png" in order

  Scenario: List values includes image data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "photo1.png"
    And a value exists with name "Value Six" and type "product" and images "photo1.png"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include images "photo1.png" in order

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
