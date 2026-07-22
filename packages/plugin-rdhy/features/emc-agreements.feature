Feature: RDHY EMC agreements

  An EMC agreement models one Ecosystem Micro-community canvas: a group of
  micro-nodes (each anchored to a core agent) collaborating on a
  shared scenario, sponsored by an RDHY industry platform. The agreement
  header carries the EMC setting: collaborative scenario, collaborative
  goals, governance model and the reinvestment share of profits set aside
  as collaborative investment. Agreements are plugin-owned
  (plugin_rdhy_emc_agreements), start life as a DRAFT, and only drafts can
  be edited or deleted. The RdhyEmcAgreement entity is a primary entity, so
  its lifecycle publishes namespaced domain events.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "web3_industry_platform" and name "Web3 Industry Platform"

  Scenario: Creating a draft EMC agreement
    When I create an EMC agreement titled "DAO Infrastructure EMC" sponsored by "web3_industry_platform" with a reinvestment share of 5 percent
    Then the response status should be 201
    And the EMC agreement response has title "DAO Infrastructure EMC" and status "DRAFT"
    And the EMC agreement response has a reinvestment share of 5 percent
    And the event "marketlum.plugin.rdhy.rdhy_emc_agreement.created" was published with the new entity's id

  Scenario: Creating an EMC agreement with an unknown sponsor platform fails
    When I create an EMC agreement titled "Unsponsored" sponsored by an unknown platform with a reinvestment share of 5 percent
    Then the response status should be 404

  Scenario: Rejecting an invalid reinvestment share
    When I create an EMC agreement titled "Greedy" sponsored by "web3_industry_platform" with a reinvestment share of 101 percent
    Then the response status should be 400

  Scenario: Listing EMC agreements with summaries
    Given an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"
    And an EMC agreement titled "Green Energy EMC" exists sponsored by "web3_industry_platform"
    When I list EMC agreements
    Then the response status should be 200
    And the EMC agreement list contains "DAO Infrastructure EMC" with platform "web3_industry_platform"
    And the EMC agreement list contains "Green Energy EMC" with platform "web3_industry_platform"

  Scenario: Updating the EMC setting while in draft
    Given an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"
    When I update the EMC agreement "DAO Infrastructure EMC" with collaborative scenario "Proposing, selling and supporting a market leading DAO technological infrastructure for corporate clients"
    Then the response status should be 200
    And the EMC agreement response has collaborative scenario "Proposing, selling and supporting a market leading DAO technological infrastructure for corporate clients"
    And the event "marketlum.plugin.rdhy.rdhy_emc_agreement.updated" was published with the entity's id

  Scenario: Setting updates are rejected once active
    Given an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"
    And the EMC agreement "DAO Infrastructure EMC" is activated
    When I update the EMC agreement "DAO Infrastructure EMC" with collaborative scenario "Too Late"
    Then the response status should be 409

  Scenario: Deleting a draft EMC agreement
    Given an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"
    When I delete the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 204
    And the event "marketlum.plugin.rdhy.rdhy_emc_agreement.deleted" was published with the entity's id

  Scenario: Deleting an active EMC agreement is rejected
    Given an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"
    And the EMC agreement "DAO Infrastructure EMC" is activated
    When I delete the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 409
