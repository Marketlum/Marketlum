Feature: Get Folder Tree

  Scenario: Get the full folder tree
    Given I am authenticated as "admin@marketlum.com"
    And the following folder tree exists:
      | name      | parent    |
      | Documents |           |
      | Invoices  | Documents |
      | Photos    |           |
    When I request the full folder tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Documents" should have 1 children

  Scenario: Get an empty folder tree
    Given I am authenticated as "admin@marketlum.com"
    When I request the full folder tree
    Then the response status should be 200
    And the tree should contain 0 root nodes

  Scenario: Unauthenticated request is rejected
    When I request the full folder tree
    Then the response status should be 401
