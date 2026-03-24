Feature: Move File to Folder

  Files can be moved between folders by updating their folderId.
  The UI supports this via drag and drop.

  Scenario: Move a file into a folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Photos"
    And a file "image.png" has been uploaded
    When I move the file to folder "Photos"
    Then the response status should be 200
    And the response should have a folderId

  Scenario: Move a file back to root
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Photos"
    And a file "image.png" has been uploaded to folder "Photos"
    When I move the file to root
    Then the response status should be 200
    And the response folderId should be null

  Scenario: Move a file to a different folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Photos"
    And a root folder exists with name "Documents"
    And a file "report.pdf" has been uploaded to folder "Photos"
    When I move the file to folder "Documents"
    Then the response status should be 200
    And the response should have a folderId matching "Documents"
