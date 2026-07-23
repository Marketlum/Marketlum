Feature: Permission Catalog

  Scenario: Listing the permission catalog returns core and plugin resources
    Given I am authenticated as "admin@marketlum.com"
    When I get the permission catalog
    Then the response status should be 200
    And the catalog should contain the resource "orders"
    And the catalog should contain the resource "roles"
    And the catalog should contain the resource "rdhy.platforms"

  Scenario: The permission catalog requires the roles permission
    Given a user "reader@marketlum.com" with a role granting "orders:read"
    When the user gets the permission catalog
    Then the response status should be 403
