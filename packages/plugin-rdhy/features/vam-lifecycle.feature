Feature: RDHY VAM agreement lifecycle

  VAM agreements follow a guarded state machine: DRAFT -> ACTIVE ->
  COMPLETED | TERMINATED. Activation stamps the start date and is refused
  while another ACTIVE agreement exists for the same agent.
  Completion and termination stamp the end date; termination must cite one
  of the agreement's own termination conditions when any exist. Terminal
  states are read-only. A platform cannot be deleted while it sponsors any
  VAM agreement; deleting the anchored agent through core cascades
  the agreement away.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an agent exists with name "Web3 ME"
    And a VAM agreement titled "Web 3 Consulting HUB" exists for the agent "Web3 ME" sponsored by "industrial_platform"

  Scenario: Activating a draft
    When I activate the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the VAM agreement response has status "ACTIVE" and a start date

  Scenario: Only one active agreement per agent
    Given the VAM agreement "Web 3 Consulting HUB" is activated
    And a VAM agreement titled "Parallel Cycle" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    When I activate the VAM agreement "Parallel Cycle"
    Then the response status should be 409

  Scenario: Activating a non-draft agreement fails
    Given the VAM agreement "Web 3 Consulting HUB" is activated
    When I activate the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 409

  Scenario: Completing an active agreement
    Given the VAM agreement "Web 3 Consulting HUB" is activated
    When I complete the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the VAM agreement response has status "COMPLETED" and an end date

  Scenario: Completing a draft fails
    When I complete the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 409

  Scenario: Terminating an active agreement citing a rule
    Given the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the sample canvas
    And the VAM agreement "Web 3 Consulting HUB" is activated
    When I terminate the VAM agreement "Web 3 Consulting HUB" citing rule 1 with note "Leading goals missed"
    Then the response status should be 200
    And the VAM agreement response has status "TERMINATED" and an end date
    And the VAM agreement "Web 3 Consulting HUB" termination cites rule 1 with note "Leading goals missed"

  Scenario: Terminating without a citation while rules exist fails
    Given the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the sample canvas
    And the VAM agreement "Web 3 Consulting HUB" is activated
    When I terminate the VAM agreement "Web 3 Consulting HUB" without citing a rule
    Then the response status should be 400

  Scenario: Terminating citing another agreement's rule fails
    Given the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the sample canvas
    And the VAM agreement "Web 3 Consulting HUB" is activated
    And a VAM agreement titled "Other Agreement" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And the canvas of the VAM agreement "Other Agreement" is replaced with the sample canvas
    When I terminate the VAM agreement "Web 3 Consulting HUB" citing a rule of the VAM agreement "Other Agreement"
    Then the response status should be 400

  Scenario: Platform deletion is blocked while sponsoring agreements
    When I delete the RDHY platform "industrial_platform"
    Then the response status should be 409
    When I delete the agent "Web3 ME" through the core API
    And I delete the RDHY platform "industrial_platform"
    Then the response status should be 204
