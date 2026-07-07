Feature: RDHY sample seeding

  The plugin contributes a seed hook that `pnpm seed:sample` runs after the
  core seeders. It creates two sample platforms and assigns a handful of
  existing value streams to them. Running it again changes nothing.

  Background:
    Given I am authenticated as "admin@marketlum.com"

  Scenario: The seed hook creates sample platforms and assigns value streams idempotently
    Given a value stream exists with code "home_appliances" and name "Home Appliances"
    And a value stream exists with code "smart_devices" and name "Smart Devices"
    When the RDHY plugin seed hook runs
    And the RDHY plugin seed hook runs again
    Then the RDHY platform "industrial_platform" exists with name "Industrial Platform"
    And the RDHY platform "shared_services" exists with name "Shared Services"
    And the value stream "home_appliances" is assigned to an RDHY platform
    And the value stream "smart_devices" is assigned to an RDHY platform

  Scenario: The seed hook creates the sample VAM agreements idempotently
    Given a value stream exists with code "home_appliances" and name "Home Appliances"
    When the RDHY plugin seed hook runs
    And the RDHY plugin seed hook runs again
    Then exactly one VAM agreement titled "Web 3 Consulting HUB" exists with status "ACTIVE" and 4 milestones
    And exactly one VAM agreement titled "Web 3 Consulting HUB — renewal" exists with status "DRAFT" and 0 milestones
