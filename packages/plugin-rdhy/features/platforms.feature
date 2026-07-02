Feature: RDHY platforms

  The RenDanHeYi plugin groups core value streams into platforms. Platforms are
  a plugin-owned catalog (plugin_rdhy_platforms); core tables and core API
  responses are never touched. All endpoints live under /plugins/rdhy and
  require an authenticated admin. The RdhyPlatform entity is the plugin's only
  primary entity, so its lifecycle publishes namespaced domain events.

  Background:
    Given I am authenticated as "admin@marketlum.com"

  Scenario: Creating a platform
    When I create an RDHY platform with code "industrial_platform" and name "Industrial Platform"
    Then the response status should be 201
    And the RDHY platform response has code "industrial_platform" and name "Industrial Platform"
    And the event "marketlum.plugin.rdhy.rdhy_platform.created" was published with the new entity's id

  Scenario: Rejecting an invalid platform code
    When I create an RDHY platform with code "Industrial Platform!" and name "Industrial Platform"
    Then the response status should be 400

  Scenario: Rejecting a duplicate platform code
    Given an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    When I create an RDHY platform with code "industrial_platform" and name "Duplicate"
    Then the response status should be 409

  Scenario: Listing platforms ordered by name with member counts
    Given an RDHY platform exists with code "shared_services" and name "Shared Services"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And a value stream exists with code "washing_machines" and name "Washing Machines"
    And the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I list RDHY platforms
    Then the response status should be 200
    And the RDHY platform list contains "Industrial Platform" before "Shared Services"
    And the listed RDHY platform "industrial_platform" has a member count of 1
    And the listed RDHY platform "shared_services" has a member count of 0

  Scenario: Platform detail includes member value stream summaries
    Given an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And a value stream exists with code "washing_machines" and name "Washing Machines"
    And the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I get the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform detail lists the member value stream "washing_machines"

  Scenario: Updating a platform's name and description
    Given an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    When I update the RDHY platform "industrial_platform" with name "Industry Platform" and description "Hosts industrial value streams"
    Then the response status should be 200
    And the RDHY platform response has code "industrial_platform" and name "Industry Platform"
    And the event "marketlum.plugin.rdhy.rdhy_platform.updated" was published with the entity's id

  Scenario: The platform code cannot be changed after creation
    Given an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    When I update the RDHY platform "industrial_platform" attempting to set code "renamed_platform"
    Then the response status should be 200
    And the RDHY platform response has code "industrial_platform" and name "Industrial Platform"

  Scenario: Deleting a platform detaches its member value streams
    Given an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And a value stream exists with code "washing_machines" and name "Washing Machines"
    And the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I delete the RDHY platform "industrial_platform"
    Then the response status should be 204
    And the value stream "washing_machines" is not assigned to any RDHY platform
    And the event "marketlum.plugin.rdhy.rdhy_platform.deleted" was published with the entity's id
