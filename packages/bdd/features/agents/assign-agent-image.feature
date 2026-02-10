Feature: Assign Image to Agent

  Scenario: Create agent with image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    When I create an agent with image "logo.png" and:
      | name      | type         | purpose        |
      | Agent One | organization | Has an image   |
    Then the response status should be 201
    And the response should include image "logo.png"

  Scenario: Create agent with non-existent image
    Given I am authenticated as "admin@marketlum.com"
    When I create an agent with a non-existent image and:
      | name      | type         | purpose        |
      | Agent Two | organization | Bad image ref  |
    Then the response status should be 404

  Scenario: Update agent's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And a file exists with name "avatar.png"
    And an agent exists with name "Agent Three" and type "organization" and image "logo.png"
    When I update the agent's image to "avatar.png"
    Then the response status should be 200
    And the response should include image "avatar.png"

  Scenario: Remove agent's image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an agent exists with name "Agent Four" and type "organization" and image "logo.png"
    When I update the agent's image to null
    Then the response status should be 200
    And the response should have null image

  Scenario: Get agent by ID includes image
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an agent exists with name "Agent Five" and type "organization" and image "logo.png"
    When I request the agent by their ID
    Then the response status should be 200
    And the response should include image "logo.png"

  Scenario: List agents includes image data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "logo.png"
    And an agent exists with name "Agent Six" and type "organization" and image "logo.png"
    When I request the list of agents
    Then the response status should be 200
    And the first agent in the list should include image "logo.png"

  Scenario: Unauthenticated request is rejected
    When I create an agent with:
      | name       | type         | purpose              |
      | Agent One  | organization | An organization agent |
    Then the response status should be 401
