Feature: Delete Folder

  Scenario: Successfully delete an empty folder
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    When I delete the folder
    Then the response status should be 204

  Scenario: Delete a folder with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And the following folder tree exists:
      | name      | parent    |
      | Documents |           |
      | Invoices  | Documents |
      | Receipts  | Invoices  |
    When I delete the folder "Documents"
    Then the response status should be 204
    And the folder "Invoices" should not exist
    And the folder "Receipts" should not exist

  Scenario: Delete a folder cascades its files
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    And a file "report.pdf" is uploaded to folder "Documents"
    When I delete the folder "Documents"
    Then the response status should be 204
    And the uploaded file should be removed from disk

  Scenario: Delete a non-existent folder returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the folder with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the folder with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
