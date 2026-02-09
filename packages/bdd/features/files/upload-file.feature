Feature: Upload File

  Scenario: Upload a file to root
    Given I am authenticated as "admin@marketlum.com"
    When I upload a file "test.png" with content type "image/png"
    Then the response status should be 201
    And the response should contain a file with originalName "test.png"
    And the response should contain a file with mimeType "image/png"
    And the file should be stored on disk

  Scenario: Upload a file to a folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    When I upload a file "report.pdf" with content type "application/pdf" to folder "Documents"
    Then the response status should be 201
    And the response should contain a file with originalName "report.pdf"
    And the response should have a folderId

  Scenario: Upload to a non-existent folder fails
    Given I am authenticated as "admin@marketlum.com"
    When I upload a file "test.png" with content type "image/png" to non-existent folder
    Then the response status should be 404

  Scenario: Upload without a file attached fails
    Given I am authenticated as "admin@marketlum.com"
    When I upload without attaching a file
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I upload a file "test.png" with content type "image/png"
    Then the response status should be 401
