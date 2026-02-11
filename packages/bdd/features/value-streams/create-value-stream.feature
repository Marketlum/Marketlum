Feature: Create Value Stream

  Scenario: Successfully create a root value stream
    Given I am authenticated as "admin@marketlum.com"
    When I create a value stream with:
      | name           | purpose                |
      | Supply Chain   | Manage supply flow     |
    Then the response status should be 201
    And the response should contain a value stream with name "Supply Chain"
    And the response should contain a value stream with purpose "Manage supply flow"

  Scenario: Successfully create a child value stream
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I create a value stream with parent "Supply Chain":
      | name         | purpose               |
      | Procurement  | Handle procurement    |
    Then the response status should be 201
    And the response should contain a value stream with name "Procurement"

  Scenario: Create value stream with lead and image
    Given I am authenticated as "admin@marketlum.com"
    And a user exists with name "Lead User"
    And a file exists with name "stream-image.png"
    When I create a value stream with lead and image:
      | name           | purpose             |
      | Distribution   | Handle distribution |
    Then the response status should be 201
    And the response should contain a value stream with name "Distribution"
    And the response should include lead "Lead User"
    And the response should include an image

  Scenario: Creating a value stream with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value stream with:
      | name | purpose |
      |      |         |
    Then the response status should be 400

  Scenario: Creating a value stream with non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value stream with non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create a value stream with:
      | name           | purpose                |
      | Supply Chain   | Manage supply flow     |
    Then the response status should be 401
