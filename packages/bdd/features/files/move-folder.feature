Feature: Move Folder

  Scenario: Move a folder to a different parent
    Given I am authenticated as "admin@marketlum.com"
    And the following folder tree exists:
      | name      | parent    |
      | Documents |           |
      | Photos    |           |
      | Invoices  | Documents |
    When I move "Invoices" to parent "Photos"
    Then the response status should be 200
    And the folder tree should show "Invoices" under "Photos"

  Scenario: Move a folder to root
    Given I am authenticated as "admin@marketlum.com"
    And the following folder tree exists:
      | name      | parent    |
      | Documents |           |
      | Invoices  | Documents |
    When I move folder "Invoices" to root
    Then the response status should be 200
    And the root folders should include "Invoices"

  Scenario: Move to a non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And a root folder exists with name "Documents"
    When I move folder "Documents" to non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I move folder with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 401
