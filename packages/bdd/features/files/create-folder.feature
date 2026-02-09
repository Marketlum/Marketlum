Feature: Create Folder

  Scenario: Successfully create a root folder
    Given I am authenticated as "admin@marketlum.com"
    When I create a folder with name "Documents"
    Then the response status should be 201
    And the response should contain a folder with name "Documents"

  Scenario: Successfully create a child folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    When I create a folder with name "Invoices" and parent "Documents"
    Then the response status should be 201
    And the response should contain a folder with name "Invoices"

  Scenario: Creating a folder with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a folder with name ""
    Then the response status should be 400

  Scenario: Creating a folder with non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a folder with non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create a folder with name "Documents"
    Then the response status should be 401
