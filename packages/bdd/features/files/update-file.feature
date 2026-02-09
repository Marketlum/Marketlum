Feature: Update File

  Scenario: Rename a file
    Given I am authenticated as "admin@marketlum.com"
    And a file "test.png" has been uploaded
    When I update the file's name to "renamed.png"
    Then the response status should be 200
    And the response should contain a file with originalName "renamed.png"

  Scenario: Move a file to a folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    And a file "test.png" has been uploaded
    When I move the file to folder "Documents"
    Then the response status should be 200
    And the response should have a folderId

  Scenario: Move a file to root
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    And a file "test.png" has been uploaded to folder "Documents"
    When I move the file to root
    Then the response status should be 200
    And the response folderId should be null

  Scenario: Update a non-existent file returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the file with ID "00000000-0000-0000-0000-000000000000" with name "test.png"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the file with ID "00000000-0000-0000-0000-000000000000" with name "test.png"
    Then the response status should be 401
