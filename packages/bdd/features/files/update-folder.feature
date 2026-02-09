Feature: Update Folder

  Scenario: Successfully rename a folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    When I update the folder's name to "My Documents"
    Then the response status should be 200
    And the response should contain a folder with name "My Documents"

  Scenario: Update a non-existent folder returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the folder with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the folder with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
