Feature: Update Value Stream

  Scenario: Successfully update a value stream's name
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I update the value stream's name to "Global Supply Chain"
    Then the response status should be 200
    And the response should contain a value stream with name "Global Supply Chain"

  Scenario: Successfully update a value stream's purpose
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I update the value stream's purpose to "Updated purpose"
    Then the response status should be 200
    And the response should contain a value stream with purpose "Updated purpose"

  Scenario: Update a non-existent value stream returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the value stream with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Updating with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    And a root value stream exists with name "Supply Chain"
    When I update the value stream's name to ""
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I update the value stream with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
