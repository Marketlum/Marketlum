Feature: Assign Image to Archetype

  Scenario: Create archetype with image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    When I create an archetype with image "logo.png" and:
      | name          |
      | Arch One      |
    Then the response status should be 201
    And the response should include image "logo.png"

  Scenario: Create archetype with non-existent image
    Given I am authenticated as "admin@marketlum.com"
    When I create an archetype with a non-existent image and:
      | name          |
      | Arch Two      |
    Then the response status should be 404

  Scenario: Update archetype's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And a file exists with name "avatar.png"
    And an archetype exists with name "Arch Three" and image "logo.png"
    When I update the archetype's image to "avatar.png"
    Then the response status should be 200
    And the response should include image "avatar.png"

  Scenario: Remove archetype's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an archetype exists with name "Arch Four" and image "logo.png"
    When I update the archetype's image to null
    Then the response status should be 200
    And the response should have null image

  Scenario: Get archetype by ID includes image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an archetype exists with name "Arch Five" and image "logo.png"
    When I request the archetype by its ID
    Then the response status should be 200
    And the response should include image "logo.png"

  Scenario: Search archetypes includes image data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an archetype exists with name "Arch Six" and image "logo.png"
    When I search archetypes
    Then the response status should be 200
    And the first archetype in the list should include image "logo.png"

  Scenario: Unauthenticated request is rejected
    When I create an archetype without authentication
    Then the response status should be 401
