Feature: RDHY EMC agreement lifecycle

  EMC agreements follow a guarded state machine: DRAFT -> ACTIVE ->
  COMPLETED | TERMINATED. Activation stamps the start date. Unlike VAM
  agreements, no exclusivity is enforced: an agent may participate
  in several active EMCs at once — that is the point of ecosystem
  micro-communities. Completion and termination stamp the end date;
  termination must cite one of the agreement's own termination conditions
  when any exist. Terminal states are read-only. A platform cannot be
  deleted while it sponsors any EMC agreement.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an RDHY platform exists with code "web3_industry_platform" and name "Web3 Industry Platform"
    And an agent exists with name "Web3 Consulting Hub"
    And an agent exists with name "Web3 Development"
    And an agent exists with name "Legal Counseling"
    And an EMC agreement titled "DAO Infrastructure EMC" exists sponsored by "web3_industry_platform"

  Scenario: Activating a draft
    When I activate the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 200
    And the EMC agreement response has status "ACTIVE" and a start date

  Scenario: An agent may participate in several active EMCs
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    And the EMC agreement "DAO Infrastructure EMC" is activated
    And an EMC agreement titled "Parallel EMC" exists sponsored by "web3_industry_platform"
    And the canvas of the EMC agreement "Parallel EMC" is replaced with the sample canvas
    When I activate the EMC agreement "Parallel EMC"
    Then the response status should be 200
    And the EMC agreement response has status "ACTIVE" and a start date

  Scenario: Activating a non-draft agreement fails
    Given the EMC agreement "DAO Infrastructure EMC" is activated
    When I activate the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 409

  Scenario: Completing an active agreement
    Given the EMC agreement "DAO Infrastructure EMC" is activated
    When I complete the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 200
    And the EMC agreement response has status "COMPLETED" and an end date

  Scenario: Completing a draft fails
    When I complete the EMC agreement "DAO Infrastructure EMC"
    Then the response status should be 409

  Scenario: Terminating an active agreement citing a rule
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    And the EMC agreement "DAO Infrastructure EMC" is activated
    When I terminate the EMC agreement "DAO Infrastructure EMC" citing rule 1 with note "Collaborative goals missed"
    Then the response status should be 200
    And the EMC agreement response has status "TERMINATED" and an end date
    And the EMC agreement "DAO Infrastructure EMC" termination cites rule 1 with note "Collaborative goals missed"

  Scenario: Terminating without a citation while rules exist fails
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    And the EMC agreement "DAO Infrastructure EMC" is activated
    When I terminate the EMC agreement "DAO Infrastructure EMC" without citing a rule
    Then the response status should be 400

  Scenario: Terminating citing another agreement's rule fails
    Given the canvas of the EMC agreement "DAO Infrastructure EMC" is replaced with the sample canvas
    And the EMC agreement "DAO Infrastructure EMC" is activated
    And an EMC agreement titled "Other EMC" exists sponsored by "web3_industry_platform"
    And the canvas of the EMC agreement "Other EMC" is replaced with the sample canvas
    When I terminate the EMC agreement "DAO Infrastructure EMC" citing a rule of the EMC agreement "Other EMC"
    Then the response status should be 400

  Scenario: Platform deletion is blocked while sponsoring agreements
    When I delete the RDHY platform "web3_industry_platform"
    Then the response status should be 409
    When I delete the EMC agreement "DAO Infrastructure EMC"
    And I delete the RDHY platform "web3_industry_platform"
    Then the response status should be 204
