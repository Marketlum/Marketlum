Feature: RDHY platform assignments

  An agent belongs to at most one RDHY platform. Membership lives in a
  plugin-owned link table (plugin_rdhy_platform_agents) holding one-way
  foreign keys to core; the core agents table is never modified. The
  assignment is manipulated through agent-centric plugin endpoints:
  PUT/DELETE/GET /plugins/rdhy/agents/:agentId/platform.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an RDHY platform exists with code "shared_services" and name "Shared Services"
    And an agent exists with name "Washing Machines Co"

  Scenario: Assigning an agent to a platform
    When I assign the agent "Washing Machines Co" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform of the agent "Washing Machines Co" is "industrial_platform"

  Scenario: Reassigning silently moves the agent to the new platform
    Given the agent "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I assign the agent "Washing Machines Co" to the RDHY platform "shared_services"
    Then the response status should be 200
    And the RDHY platform of the agent "Washing Machines Co" is "shared_services"
    And the RDHY platform "industrial_platform" has a member count of 0

  Scenario: Assigning to the same platform twice is idempotent
    Given the agent "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I assign the agent "Washing Machines Co" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform "industrial_platform" has a member count of 1

  Scenario: Detaching an agent from its platform
    Given the agent "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I detach the agent "Washing Machines Co" from its RDHY platform
    Then the response status should be 204
    And the agent "Washing Machines Co" is not assigned to any RDHY platform

  Scenario: Detaching an unassigned agent is idempotent
    When I detach the agent "Washing Machines Co" from its RDHY platform
    Then the response status should be 204

  Scenario: Looking up the platform of an unassigned agent returns null
    When I look up the RDHY platform of the agent "Washing Machines Co"
    Then the response status should be 200
    And the RDHY platform lookup returns no platform

  Scenario: Assigning an unknown agent fails
    When I assign an unknown agent to the RDHY platform "industrial_platform"
    Then the response status should be 404

  Scenario: Assigning to an unknown platform fails
    When I assign the agent "Washing Machines Co" to an unknown RDHY platform
    Then the response status should be 404

  Scenario: Deleting an agent removes its platform assignment
    Given the agent "Washing Machines Co" is assigned to the RDHY platform "industrial_platform"
    When I delete the agent "Washing Machines Co" through the core API
    Then the response status should be 204
    And the RDHY platform "industrial_platform" has a member count of 0
