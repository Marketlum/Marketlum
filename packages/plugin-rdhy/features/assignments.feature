Feature: RDHY platform assignments

  A value stream belongs to at most one RDHY platform. Membership lives in a
  plugin-owned link table (plugin_rdhy_platform_value_streams) holding one-way
  foreign keys to core; the core value_streams table is never modified. The
  assignment is manipulated through value-stream-centric plugin endpoints:
  PUT/DELETE/GET /plugins/rdhy/value-streams/:valueStreamId/platform.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an RDHY platform exists with code "shared_services" and name "Shared Services"
    And a value stream exists with code "washing_machines" and name "Washing Machines"

  Scenario: Assigning a value stream to a platform
    When I assign the value stream "washing_machines" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform of the value stream "washing_machines" is "industrial_platform"

  Scenario: Reassigning silently moves the value stream to the new platform
    Given the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I assign the value stream "washing_machines" to the RDHY platform "shared_services"
    Then the response status should be 200
    And the RDHY platform of the value stream "washing_machines" is "shared_services"
    And the RDHY platform "industrial_platform" has a member count of 0

  Scenario: Assigning to the same platform twice is idempotent
    Given the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I assign the value stream "washing_machines" to the RDHY platform "industrial_platform"
    Then the response status should be 200
    And the RDHY platform "industrial_platform" has a member count of 1

  Scenario: Detaching a value stream from its platform
    Given the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I detach the value stream "washing_machines" from its RDHY platform
    Then the response status should be 204
    And the value stream "washing_machines" is not assigned to any RDHY platform

  Scenario: Detaching an unassigned value stream is idempotent
    When I detach the value stream "washing_machines" from its RDHY platform
    Then the response status should be 204

  Scenario: Looking up the platform of an unassigned value stream returns null
    When I look up the RDHY platform of the value stream "washing_machines"
    Then the response status should be 200
    And the RDHY platform lookup returns no platform

  Scenario: Assigning an unknown value stream fails
    When I assign an unknown value stream to the RDHY platform "industrial_platform"
    Then the response status should be 404

  Scenario: Assigning to an unknown platform fails
    When I assign the value stream "washing_machines" to an unknown RDHY platform
    Then the response status should be 404

  Scenario: Deleting a value stream removes its platform assignment
    Given the value stream "washing_machines" is assigned to the RDHY platform "industrial_platform"
    When I delete the value stream "washing_machines" through the core API
    Then the response status should be 204
    And the RDHY platform "industrial_platform" has a member count of 0
