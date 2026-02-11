Feature: Assign Image to Value Stream

  Scenario: Create value stream with image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "stream-image.png"
    When I create a value stream with image:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 201
    And the response should include an image

  Scenario: Create value stream with non-existent image fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value stream with non-existent image:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 404

  Scenario: Update value stream image
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    And a file exists with name "new-image.png"
    When I update the value stream's image
    Then the response status should be 200
    And the response should include an image

  Scenario: Remove value stream image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "stream-image.png"
    And a value stream exists with name "Supply Chain" and image
    When I remove the value stream's image
    Then the response status should be 200
    And the response should have null image

  Scenario: Unauthenticated request is rejected
    When I create a value stream with:
      | name           | purpose            |
      | Supply Chain   | Manage supply flow |
    Then the response status should be 401
