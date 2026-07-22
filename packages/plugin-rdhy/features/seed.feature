Feature: RDHY sample seeding

  The plugin contributes a seed hook that `pnpm seed:sample` runs after the
  core seeders. It creates two sample platforms and assigns a handful of
  existing agents to them. Running it again changes nothing.

  Background:
    Given I am authenticated as "admin@marketlum.com"

  Scenario: The seed hook creates sample platforms and assigns agents idempotently
    Given an agent exists with name "Home Appliances Co"
    And an agent exists with name "Smart Devices Co"
    When the RDHY plugin seed hook runs
    And the RDHY plugin seed hook runs again
    Then the RDHY platform "industrial_platform" exists with name "Industrial Platform"
    And the RDHY platform "shared_services" exists with name "Shared Services"
    And the agent "Home Appliances Co" is assigned to an RDHY platform
    And the agent "Smart Devices Co" is assigned to an RDHY platform

  Scenario: The seed hook creates the sample VAM agreements idempotently
    Given an agent exists with name "Home Appliances Co"
    When the RDHY plugin seed hook runs
    And the RDHY plugin seed hook runs again
    Then exactly one VAM agreement titled "Web 3 Consulting HUB" exists with status "ACTIVE" and 4 milestones
    And exactly one VAM agreement titled "Web 3 Consulting HUB — renewal" exists with status "DRAFT" and 0 milestones

  Scenario: The seed hook creates the sample EMC agreement idempotently
    Given an agent exists with name "Home Appliances Co"
    And an agent exists with name "Smart Devices Co"
    And an agent exists with name "Web3 Consulting Co"
    When the RDHY plugin seed hook runs
    And the RDHY plugin seed hook runs again
    Then exactly one EMC agreement titled "DAO Infrastructure EMC" exists with status "ACTIVE" and 3 micro-nodes
