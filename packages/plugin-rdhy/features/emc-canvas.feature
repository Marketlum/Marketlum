Feature: RDHY EMC canvas editing

  The canvas content of an EMC agreement — micro-nodes with their exposed
  services, leading goals and cost entries, plus termination conditions —
  is replaced as one document via PUT /plugins/rdhy/emc-agreements/:id/canvas.
  Each micro-node is anchored to a core value stream and sits in one of two
  tiers: STRATEGIC nodes participate through value sharing (a percent of
  the profits), TACTICAL nodes participate without value sharing. When any
  nodes exist, exactly one must be the leading node and it must be
  strategic. The replace is transactional, array order defines display
  order, and it is only allowed while the agreement is a DRAFT. The
  "sample canvas" used in these scenarios has 3 micro-nodes — the leading
  strategic node "web3_hub_stream" with a 10 percent share, 2 services,
  2 goals and 2 cost entries; the strategic node "web3_dev_stream" with a
  7 percent share, 1 service, 1 goal and 1 cost entry; the tactical node
  "legal_stream" with 1 service, 1 goal and 1 cost entry — and 2
  termination conditions. The "minimal canvas" has a single leading
  strategic node with one service and nothing else.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "web3_industry_platform" and name "Web3 Industry Platform"
    And a value stream exists with code "web3_hub_stream" and name "Web3 Consulting Hub"
    And a value stream exists with code "web3_dev_stream" and name "Web3 Development"
    And a value stream exists with code "legal_stream" and name "Legal Counseling"
    And an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"

  Scenario: Replacing the canvas populates all sections in order
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with the sample canvas
    Then the response status should be 200
    And the EMC canvas has 3 micro-nodes, 4 services, 4 goals, 4 cost entries and 2 termination conditions
    And the EMC canvas micro-nodes are ordered "web3_hub_stream, web3_dev_stream, legal_stream"
    And the EMC canvas micro-node "web3_hub_stream" is the leading node with a 10 percent share

  Scenario: Re-replacing the canvas discards the previous content
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with the minimal canvas
    Then the response status should be 200
    And the EMC canvas has 1 micro-nodes, 1 services, 0 goals, 0 cost entries and 0 termination conditions

  Scenario: A canvas with nodes but no leading node is rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas where no node is leading
    Then the response status should be 400

  Scenario: A canvas with two leading nodes is rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas where two nodes are leading
    Then the response status should be 400

  Scenario: A tactical leading node is rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas where a tactical node is leading
    Then the response status should be 400

  Scenario: A profit share on a tactical node is rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas where a tactical node has a profit share
    Then the response status should be 400

  Scenario: Profit shares exceeding the available pool are rejected
    Given the EMC agreement "DAO Infrastructure EMC" has a reinvestment share of 5 percent
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas whose profit shares sum to 96 percent
    Then the response status should be 400

  Scenario: Duplicate micro-nodes for the same value stream are rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas containing the value stream "web3_hub_stream" twice
    Then the response status should be 400

  Scenario: A micro-node for an unknown value stream is rejected
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with a canvas containing an unknown value stream
    Then the response status should be 404

  Scenario: Canvas edits are rejected once active
    Given the EMC agreement "DAO Infrastructure EMC" is activated
    When I replace the canvas of the EMC agreement "DAO Infrastructure EMC" with the sample canvas
    Then the response status should be 409

  Scenario: Deleting a value stream through core removes its micro-node
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    When I delete the value stream "legal_stream" through the core API
    And I fetch the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 200
    And the EMC canvas has 2 micro-nodes, 3 services, 3 goals, 3 cost entries and 2 termination conditions
