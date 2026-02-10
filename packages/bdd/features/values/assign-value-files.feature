Feature: Assign Files to Values

  Scenario: Create value with files
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "doc.pdf"
    And a file exists with name "image.png"
    When I create a value with files "doc.pdf,image.png" and:
      | name      | type    | purpose      |
      | Value One | product | Has files    |
    Then the response status should be 201
    And the response should include files "doc.pdf,image.png"

  Scenario: Create value with non-existent file
    Given I am authenticated as "admin@marketlum.com"
    When I create a value with a non-existent file and:
      | name      | type    | purpose        |
      | Value Two | product | Bad file ref   |
    Then the response status should be 404

  Scenario: Update value's files
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "doc.pdf"
    And a file exists with name "image.png"
    And a value exists with name "Value Three" and type "product" and files "doc.pdf"
    When I update the value's files to "image.png"
    Then the response status should be 200
    And the response should include files "image.png"

  Scenario: Remove value's files
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "doc.pdf"
    And a value exists with name "Value Four" and type "product" and files "doc.pdf"
    When I update the value's files to empty
    Then the response status should be 200
    And the response should have empty files

  Scenario: Get value by ID includes files
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "doc.pdf"
    And a value exists with name "Value Five" and type "product" and files "doc.pdf"
    When I request the value by its ID
    Then the response status should be 200
    And the response should include files "doc.pdf"

  Scenario: List values includes file data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "doc.pdf"
    And a value exists with name "Value Six" and type "product" and files "doc.pdf"
    When I request the list of values
    Then the response status should be 200
    And the first value in the list should include files "doc.pdf"

  Scenario: Unauthenticated request is rejected
    When I create a value with:
      | name       | type    | purpose         |
      | Value One  | product | A product value |
    Then the response status should be 401
