Feature: Assign Value Instance Image

  Scenario: Create value instance with image
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a file exists with name "panel.jpg"
    When I create a value instance with image "panel.jpg" and:
      | name          | purpose       |
      | Panel Unit #1 | Image test    |
    Then the response status should be 201
    And the response should include image "panel.jpg"

  Scenario: Update value instance's image
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a file exists with name "panel.jpg"
    And a file exists with name "panel-v2.jpg"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with image "panel.jpg"
    When I update the value instance's image to "panel-v2.jpg"
    Then the response status should be 200
    And the response should include image "panel-v2.jpg"

  Scenario: Remove value instance's image
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    And a file exists with name "panel.jpg"
    And a value instance exists with name "Panel Unit" for value "Solar Panel" with image "panel.jpg"
    When I update the value instance's image to null
    Then the response status should be 200
    And the response should have null image

  Scenario: Create value instance with non-existent image fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    When I create a value instance with non-existent image and:
      | name          | purpose     |
      | Panel Unit    | Bad image   |
    Then the response status should be 404
