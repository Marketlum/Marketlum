Feature: Assign Image to Actor

  Scenario: Create actor with image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    When I create an actor with image "logo.png" and:
      | name      | type         | purpose        |
      | Actor One | organization | Has an image   |
    Then the response status should be 201
    And the response should include image "logo.png"

  Scenario: Create actor with non-existent image
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with a non-existent image and:
      | name      | type         | purpose        |
      | Actor Two | organization | Bad image ref  |
    Then the response status should be 404

  Scenario: Update actor's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And a file exists with name "avatar.png"
    And an actor exists with name "Actor Three" and type "organization" and image "logo.png"
    When I update the actor's image to "avatar.png"
    Then the response status should be 200
    And the response should include image "avatar.png"

  Scenario: Remove actor's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an actor exists with name "Actor Four" and type "organization" and image "logo.png"
    When I update the actor's image to null
    Then the response status should be 200
    And the response should have null image

  Scenario: Get actor by ID includes image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an actor exists with name "Actor Five" and type "organization" and image "logo.png"
    When I request the actor by their ID
    Then the response status should be 200
    And the response should include image "logo.png"

  Scenario: List actors includes image data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an actor exists with name "Actor Six" and type "organization" and image "logo.png"
    When I request the list of actors
    Then the response status should be 200
    And the first actor in the list should include image "logo.png"

  Scenario: Unauthenticated request is rejected
    When I create an actor with:
      | name       | type         | purpose              |
      | Actor One  | organization | An organization actor |
    Then the response status should be 401
