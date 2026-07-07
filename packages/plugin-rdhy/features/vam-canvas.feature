Feature: RDHY VAM canvas editing

  The canvas content of a VAM agreement — milestones with their grid items,
  operating-cost entries, investment entries and termination conditions — is
  replaced as one document via PUT /plugins/rdhy/vam-agreements/:id/canvas.
  The replace is transactional, array order defines display order, and it is
  only allowed while the agreement is a DRAFT. The "sample canvas" used in
  these scenarios has milestones at 3, 6, 9 and 12 months carrying 6 grid
  items across the five tracks, 2 cost entries, 2 investment entries and 2
  termination conditions; the "minimal canvas" has a single milestone with
  one item and nothing else.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And a value stream exists with code "web3_stream" and name "Web3 Stream"
    And a VAM agreement titled "Web 3 Consulting HUB" exists for the value stream "web3_stream" sponsored by "industrial_platform"

  Scenario: Replacing the canvas populates all sections in order
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with the sample canvas
    Then the response status should be 200
    And the canvas has 4 milestones, 6 grid items, 2 cost entries, 2 investment entries and 2 termination conditions
    And the canvas milestones are ordered "3, 6, 9, 12"

  Scenario: Re-replacing the canvas discards the previous content
    Given the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the sample canvas
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with the minimal canvas
    Then the response status should be 200
    And the canvas has 1 milestones, 1 grid items, 0 cost entries, 0 investment entries and 0 termination conditions

  Scenario: Duplicate milestone offsets are rejected
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with a canvas containing duplicate milestone offsets
    Then the response status should be 400

  Scenario: Milestone offsets beyond the horizon are rejected
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with a canvas containing a milestone at 24 months
    Then the response status should be 400

  Scenario: Invalid track values are rejected
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with a canvas containing an invalid track
    Then the response status should be 400

  Scenario: Canvas edits are rejected once active
    Given the VAM agreement "Web 3 Consulting HUB" is activated
    When I replace the canvas of the VAM agreement "Web 3 Consulting HUB" with the sample canvas
    Then the response status should be 409
