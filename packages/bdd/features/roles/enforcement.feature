Feature: Permission Enforcement

  Scenario: A read permission allows reading but not writing the resource
    Given a user "reader@marketlum.com" with a role granting "orders:read"
    When the user lists orders
    Then the response status should be 200
    When the user creates an order
    Then the response status should be 403

  Scenario: A user with no roles is denied but can still see who they are
    Given a user "nobody@marketlum.com" with no roles
    When the user lists orders
    Then the response status should be 403
    When the user requests the current user
    Then the response status should be 200
    And the current user permissions should be empty

  Scenario: A wildcard role allows everything
    Given a user "root@marketlum.com" with a role granting "*"
    When the user lists orders
    Then the response status should be 200
    When the user creates a value
    Then the response status should be 201

  Scenario: A parent role inherits its child roles' grants
    Given a role "Viewer" with code "viewer" granting "orders:read"
    And a role "Manager" with code "manager" granting "invoices:read" whose child is "viewer"
    And a user "manager@marketlum.com" holding the role "manager"
    When the user lists orders
    Then the response status should be 200

  Scenario: Permissions are the union of all assigned roles
    Given a role "Orders Reader" with code "orders_reader" granting "orders:read"
    And a role "Values Reader" with code "values_reader" granting "values:read"
    And a user "multi@marketlum.com" holding the roles "orders_reader,values_reader"
    When the user lists orders
    Then the response status should be 200
    When the user lists values
    Then the response status should be 200

  Scenario: An API key is limited by its owner's roles
    Given a user "reader@marketlum.com" with a role granting "orders:read"
    And the user has created an API key
    When an order is created using the API key
    Then the response status should be 403
    When orders are listed using the API key
    Then the response status should be 200

  Scenario: A user without roles can still manage their own API keys
    Given a user "nobody@marketlum.com" with no roles
    When the user creates an API key named "Self service"
    Then the response status should be 201

  Scenario: Role management endpoints require the roles permission
    Given a user "reader@marketlum.com" with a role granting "orders:read"
    When the user lists the roles
    Then the response status should be 403

  Scenario: Plugin routes are gated by plugin resources
    Given a user "rdhy@marketlum.com" with a role granting "rdhy.platforms:read"
    When the user lists RDHY platforms
    Then the response status should be 200
    When the user lists orders
    Then the response status should be 403

  Scenario: The last wildcard-holding user cannot lose their roles
    Given I am authenticated as "admin@marketlum.com"
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    When I replace my own roles with "order_viewer"
    Then the response status should be 409

  Scenario: A wildcard user can be reassigned while another admin remains
    Given I am authenticated as "admin@marketlum.com"
    And another admin user "admin2@marketlum.com" exists
    And a role "Order Viewer" with code "order_viewer" and permissions "orders:read" exists
    When I replace my own roles with "order_viewer"
    Then the response status should be 200
    When the user lists orders
    Then the response status should be 200
    When the user lists the roles
    Then the response status should be 403
