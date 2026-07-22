Feature: RDHY VAM agreements

  A VAM agreement models one Value Adjustment Mechanism canvas: a value
  co-creation plan for an agent over a time horizon, sponsored by an
  RDHY platform. Agreements are plugin-owned (plugin_rdhy_vam_agreements),
  start life as a DRAFT, and only drafts can be edited or deleted. The
  RdhyVamAgreement entity is a primary entity, so its lifecycle publishes
  namespaced domain events.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an agent exists with name "Web3 ME"

  Scenario: Creating a draft VAM agreement
    When I create a VAM agreement titled "Web 3 Consulting HUB" for the agent "Web3 ME" sponsored by "industrial_platform" over 12 months
    Then the response status should be 201
    And the VAM agreement response has title "Web 3 Consulting HUB" and status "DRAFT"
    And the event "marketlum.plugin.rdhy.rdhy_vam_agreement.created" was published with the new entity's id

  Scenario: Creating a VAM agreement for an unknown agent fails
    When I create a VAM agreement titled "Orphan" for an unknown agent sponsored by "industrial_platform" over 12 months
    Then the response status should be 404

  Scenario: Creating a VAM agreement with an unknown sponsor platform fails
    When I create a VAM agreement titled "Unsponsored" for the agent "Web3 ME" sponsored by an unknown platform over 12 months
    Then the response status should be 404

  Scenario: Rejecting an invalid horizon
    When I create a VAM agreement titled "Instant" for the agent "Web3 ME" sponsored by "industrial_platform" over 0 months
    Then the response status should be 400

  Scenario: Listing VAM agreements with summaries
    Given a VAM agreement titled "First Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And a VAM agreement titled "Second Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    When I list VAM agreements
    Then the response status should be 200
    And the VAM agreement list contains "First Cycle" with agent "Web3 ME" and platform "industrial_platform"
    And the VAM agreement list contains "Second Cycle" with agent "Web3 ME" and platform "industrial_platform"

  Scenario: Updating metadata while in draft
    Given a VAM agreement titled "First Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    When I update the VAM agreement "First Cycle" with title "First Cycle Renewed"
    Then the response status should be 200
    And the VAM agreement response has title "First Cycle Renewed" and status "DRAFT"
    And the event "marketlum.plugin.rdhy.rdhy_vam_agreement.updated" was published with the entity's id

  Scenario: Metadata updates are rejected once active
    Given a VAM agreement titled "First Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And the VAM agreement "First Cycle" is activated
    When I update the VAM agreement "First Cycle" with title "Too Late"
    Then the response status should be 409

  Scenario: Deleting a draft VAM agreement
    Given a VAM agreement titled "First Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    When I delete the VAM agreement "First Cycle"
    Then the response status should be 204
    And the event "marketlum.plugin.rdhy.rdhy_vam_agreement.deleted" was published with the entity's id

  Scenario: Deleting an active VAM agreement is rejected
    Given a VAM agreement titled "First Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And the VAM agreement "First Cycle" is activated
    When I delete the VAM agreement "First Cycle"
    Then the response status should be 409
