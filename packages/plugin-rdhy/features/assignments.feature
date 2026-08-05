Feature: RDHY platform assignments

  An actor belongs to at most one RDHY platform. Membership lives in a
  plugin-owned link table (plugin_rdhy_platform_actors) holding one-way
  foreign keys to core; the core actors table is never modified. The
  assignment is manipulated through actor-centric plugin endpoints:
  PUT/DELETE/GET /plugins/rdhy/actors/:actorId/platform.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an RDHY platform exists with code "shared_services" and name "Shared Services"
    And an actor exists with name "Washing Machines Co"

  Scenario: Assigning an actor to a platform
    When I assign the actor "Washing Machines Co" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform of the actor "Washing Machines Co" is "industrial_platform"

  Scenario: Reassigning silently moves the actor to the new platform
    Given the actor "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I assign the actor "Washing Machines Co" to the RDHY platform "shared_services"
    Then the response status should be 200
    And the RDHY platform of the actor "Washing Machines Co" is "shared_services"
    And the RDHY platform "industrial_platform" has a member count of 0

  Scenario: Assigning to the same platform twice is idempotent
    Given the actor "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I assign the actor "Washing Machines Co" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform "industrial_platform" has a member count of 1

  Scenario: Detaching an actor from its platform
    Given the actor "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I detach the actor "Washing Machines Co" from its RDHY platform
    Then the response status should be 204
    And the actor "Washing Machines Co" is not assigned to any RDHY platform

  Scenario: Detaching an unassigned actor is idempotent
    When I detach the actor "Washing Machines Co" from its RDHY platform
    Then the response status should be 204

  Scenario: Looking up the platform of an unassigned actor returns null
    When I look up the RDHY platform of the actor "Washing Machines Co"
    Then the response status should be 200
    And the RDHY platform lookup returns no platform

  Scenario: Assigning an unknown actor fails
    When I assign an unknown actor to the RDHY platform "industrial_platform"
    Then the response status should be 404

  Scenario: Assigning to an unknown platform fails
    When I assign the actor "Washing Machines Co" to an unknown RDHY platform
    Then the response status should be 404

  Scenario: Deleting an actor removes its platform assignment
    Given the actor "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I delete the actor "Washing Machines Co" through the core API
    Then the response status should be 204
    And the RDHY platform "industrial_platform" has a member count of 0
