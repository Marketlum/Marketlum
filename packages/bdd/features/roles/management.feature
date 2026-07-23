Feature: Role Management

  Scenario: Creating a role with permissions
    Given I am authenticated as "admin@marketlum.com"
    When I create a role "Order Viewer" with code "order_viewer" and permissions "orders:read,invoices:read"
    Then the response status should be 201
    And the role response should have permissions "orders:read,invoices:read"

  Scenario: Creating a role with a malformed permission string fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a role "Bad" with code "bad_role" and permissions "orders:destroy"
    Then the response status should be 400

  Scenario: Creating a role with an unknown resource fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a role "Bad" with code "bad_role" and permissions "unicorns:read"
    Then the response status should be 400

  Scenario: Listing roles
    Given I am authenticated as "admin@marketlum.com"
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    When I list the roles
    Then the response status should be 200
    And the role list should contain a role with code "order_viewer"
    And the role list should contain a role with code "admin"

  Scenario: Updating a role replaces its permissions
    Given I am authenticated as "admin@marketlum.com"
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    When I update the role "order_viewer" with permissions "invoices:read,invoices:write"
    Then the response status should be 200
    And the role response should have permissions "invoices:read,invoices:write"

  Scenario: Reparenting a role
    Given I am authenticated as "admin@marketlum.com"
    And a role "Viewer" with code "viewer" and permissions "orders:read" exists
    And a role "Manager" with code "manager" and permissions "orders:write" exists
    When I set the parent of role "viewer" to "manager"
    Then the response status should be 200

  Scenario: Creating a parent cycle fails
    Given I am authenticated as "admin@marketlum.com"
    And a role "Viewer" with code "viewer" and permissions "orders:read" exists
    And a role "Manager" with code "manager" and permissions "orders:write" exists
    And the parent of role "viewer" is "manager"
    When I set the parent of role "manager" to "viewer"
    Then the response status should be 409

  Scenario: Deleting a role that users hold fails
    Given I am authenticated as "admin@marketlum.com"
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    And a user "viewer@marketlum.com" holds the role "order_viewer"
    When I delete the role "order_viewer"
    Then the response status should be 409

  Scenario: Deleting a role with child roles fails
    Given I am authenticated as "admin@marketlum.com"
    And a role "Viewer" with code "viewer" and permissions "orders:read" exists
    And a role "Manager" with code "manager" and permissions "orders:write" exists
    And the parent of role "viewer" is "manager"
    When I delete the role "manager"
    Then the response status should be 409

  Scenario: Deleting an unreferenced role succeeds
    Given I am authenticated as "admin@marketlum.com"
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    When I delete the role "order_viewer"
    Then the response status should be 204

  Scenario: The system Admin role cannot be deleted
    Given I am authenticated as "admin@marketlum.com"
    When I delete the role "admin"
    Then the response status should be 409

  Scenario: The system Admin role grants cannot be changed
    Given I am authenticated as "admin@marketlum.com"
    When I update the role "admin" with permissions "orders:read"
    Then the response status should be 409

  Scenario: Creating a role under a missing parent fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a role "Orphan" with code "orphan" under a nonexistent parent
    Then the response status should be 404
