Feature: Manage Perspectives

  # --- CREATE ---

  Scenario: Successfully create a perspective
    Given I am authenticated as "admin@marketlum.com"
    When I create a perspective with:
      | name          | table  |
      | My View       | values |
    Then the response status should be 201
    And the response should contain a perspective with name "My View"
    And the response should contain a perspective with table "values"

  Scenario: Create a perspective with full config
    Given I am authenticated as "admin@marketlum.com"
    When I create a perspective with name "Full Config" for table "agents" and config:
      | columnVisibility       | filters              | sortBy | sortOrder |
      | {"purpose":false}      | {"type":"organization"} | name   | DESC      |
    Then the response status should be 201
    And the response should contain a perspective with name "Full Config"
    And the response config should have columnVisibility with purpose set to false
    And the response config should have sort with sortBy "name" and sortOrder "DESC"

  Scenario: Creating a perspective with isDefault unsets previous default
    Given I am authenticated as "admin@marketlum.com"
    And I have a default perspective "First Default" for table "values"
    When I create a perspective with:
      | name           | table  | isDefault |
      | Second Default | values | true      |
    Then the response status should be 201
    And the perspective "First Default" should no longer be default

  Scenario: Creating a perspective with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a perspective with:
      | name | table   |
      |      | invalid |
    Then the response status should be 400

  Scenario: Unauthenticated create is rejected
    When I create a perspective with:
      | name     | table  |
      | My View  | values |
    Then the response status should be 401

  # --- LIST ---

  Scenario: List perspectives for a table
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Values View" for table "values"
    And I have a perspective "Agents View" for table "agents"
    When I list perspectives for table "values"
    Then the response status should be 200
    And the response should contain 1 perspective
    And the response should contain a perspective named "Values View"

  Scenario: Other user perspectives are not visible
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Admin View" for table "values"
    When I am authenticated as "other@marketlum.com"
    And I list perspectives for table "values"
    Then the response status should be 200
    And the response should contain 0 perspectives

  Scenario: Unauthenticated list is rejected
    When I list perspectives for table "values"
    Then the response status should be 401

  # --- UPDATE ---

  Scenario: Update perspective name
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Old Name" for table "values"
    When I update perspective "Old Name" with:
      | name     |
      | New Name |
    Then the response status should be 200
    And the response should contain a perspective with name "New Name"

  Scenario: Update perspective config
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Config View" for table "values"
    When I update perspective "Config View" with config:
      | columnVisibility       | filters              | sortBy | sortOrder |
      | {"createdAt":false}    | {"type":"product"}   | name   | ASC       |
    Then the response status should be 200
    And the response config should have columnVisibility with createdAt set to false
    And the response config should have filters with type set to "product"

  Scenario: Setting isDefault unsets previous default on update
    Given I am authenticated as "admin@marketlum.com"
    And I have a default perspective "First Default" for table "values"
    And I have a perspective "Second View" for table "values"
    When I update perspective "Second View" with:
      | isDefault |
      | true      |
    Then the response status should be 200
    And the perspective "First Default" should no longer be default

  Scenario: Cannot update another user perspective
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Admin View" for table "values"
    When I am authenticated as "other@marketlum.com"
    And I update perspective "Admin View" with:
      | name       |
      | Hacked     |
    Then the response status should be 404

  Scenario: Updating non-existent perspective returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update perspective with id "00000000-0000-0000-0000-000000000000" with:
      | name     |
      | Whatever |
    Then the response status should be 404

  Scenario: Unauthenticated update is rejected
    When I update perspective with id "00000000-0000-0000-0000-000000000000" with:
      | name     |
      | Whatever |
    Then the response status should be 401

  # --- DELETE ---

  Scenario: Delete a perspective
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "To Delete" for table "values"
    When I delete perspective "To Delete"
    Then the response status should be 204

  Scenario: Cannot delete another user perspective
    Given I am authenticated as "admin@marketlum.com"
    And I have a perspective "Admin View" for table "values"
    When I am authenticated as "other@marketlum.com"
    And I delete perspective "Admin View"
    Then the response status should be 404

  Scenario: Deleting non-existent perspective returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete perspective with id "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated delete is rejected
    When I delete perspective with id "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
