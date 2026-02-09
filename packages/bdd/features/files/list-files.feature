Feature: List Files

  Scenario: List files with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following files exist:
      | name       | contentType     |
      | test1.png  | image/png       |
      | test2.pdf  | application/pdf |
      | test3.jpg  | image/jpeg      |
    When I request the list of files
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Filter files by folderId
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    And a file "report.pdf" is uploaded to folder "Documents"
    And a file "photo.png" is uploaded to root
    When I request the list of files in folder "Documents"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Filter root-only files
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    And a file "report.pdf" is uploaded to folder "Documents"
    And a file "photo.png" is uploaded to root
    When I request the list of root files
    Then the response status should be 200
    And the total count should be 1

  Scenario: Unauthenticated request is rejected
    When I request the list of files
    Then the response status should be 401
