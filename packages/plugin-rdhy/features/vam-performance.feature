Feature: RDHY VAM agreement performance

  A read-only plan-vs-actual view for a VAM agreement: cumulative
  DIRECT_VALUE revenue targets per milestone are compared against the
  agent's actual invoice revenue (per-agent snapshot amounts in the
  agent's functional currency). Judgments require the agreement and
  agent currencies to match; otherwise a comparability state explains
  what is missing. Milestones due before the evaluation cutoff are
  ACHIEVED or MISSED (revenue strictly before the due date), the
  current milestone of an active agreement is ON_TRACK or BEHIND
  against a day-granular pro-rata target, later milestones are
  UPCOMING. The cutoff is clamped at the end date for completed and
  terminated agreements. Performance is undefined for drafts.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an RDHY platform exists with code "industrial_platform" and name "Industrial Platform"
    And an agent exists with name "Web3 ME" and functional currency "USD"
    And an agent exists with name "Acme Client" and functional currency "USD"
    And a VAM agreement titled "Web 3 Consulting HUB" in currency "USD" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the performance canvas

  Scenario: Plan versus actual for a comparable agreement
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 7 months ago
    And a currency value exists named "EUR"
    And an invoice exists from "Web3 ME" to "Acme Client" issued 1 months after the start of "Web 3 Consulting HUB" amount "300000"
    And an invoice exists from "Web3 ME" to "Acme Client" issued 5 months after the start of "Web 3 Consulting HUB" amount "150000"
    And an invoice exists from "Web3 ME" to "Web3 ME" issued 6 months after the start of "Web 3 Consulting HUB" amount "50000"
    And an invoice exists from "Web3 ME" to "Acme Client" in "EUR" issued 2 months after the start of "Web 3 Consulting HUB" amount "100000"
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance comparability is "COMPARABLE"
    And the performance milestone at month 3 has cumulative target "0.00" and no status
    And the performance milestone at month 6 has cumulative target "500000.00" and status "MISSED"
    And the performance milestone at month 6 has cumulative actual "450000.00" and attainment 90
    And the performance milestone at month 9 has cumulative target "1000000.00" and status "BEHIND"
    And the performance milestone at month 9 has cumulative actual "500000.00" and attainment 50
    And the performance milestone at month 12 has cumulative target "1000000.00" and status "UPCOMING"
    And the performance overall status is "BEHIND"
    And the performance invoice count is 4 and not converted count is 1
    And the performance monthly actuals have 8 entries with final cumulative "500000.00"

  Scenario: A past milestone with enough revenue is achieved
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 7 months ago
    And an invoice exists from "Web3 ME" to "Acme Client" issued 2 months after the start of "Web 3 Consulting HUB" amount "600000"
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance milestone at month 6 has cumulative target "500000.00" and status "ACHIEVED"
    And the performance milestone at month 6 has cumulative actual "600000.00" and attainment 120

  Scenario: A missed milestone is not rescued by revenue after the window
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 8 months ago
    And an invoice exists from "Web3 ME" to "Acme Client" issued 2 months after the start of "Web 3 Consulting HUB" amount "400000"
    And an invoice exists from "Web3 ME" to "Acme Client" issued 7 months after the start of "Web 3 Consulting HUB" amount "600000"
    And the VAM agreement "Web 3 Consulting HUB" is terminated with an end date 6 months after its start
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance milestone at month 6 has cumulative target "500000.00" and status "MISSED"
    And the performance milestone at month 6 has cumulative actual "400000.00" and attainment 80
    And the performance milestone at month 9 has cumulative target "1000000.00" and status "UPCOMING"
    And the performance summary shows target "500000.00" actual "400000.00" attainment 80 and overall status "MISSED"

  Scenario: The current milestone is on track against the pro-rata target
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 5 months ago
    And an invoice exists from "Web3 ME" to "Acme Client" issued 1 months after the start of "Web 3 Consulting HUB" amount "400000"
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance milestone at month 6 has cumulative target "500000.00" and status "ON_TRACK"
    And the performance milestone at month 6 has cumulative actual "400000.00" and attainment 80
    And the performance overall status is "ON_TRACK"

  Scenario: The current milestone falls behind the pro-rata target
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 5 months ago
    And an invoice exists from "Web3 ME" to "Acme Client" issued 1 months after the start of "Web 3 Consulting HUB" amount "200000"
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance milestone at month 6 has cumulative target "500000.00" and status "BEHIND"
    And the performance milestone at month 6 has cumulative actual "200000.00" and attainment 40

  Scenario: Future milestones are upcoming and qualitative milestones are not judged
    Given the VAM agreement "Web 3 Consulting HUB" is activated with a start date 1 months ago
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance milestone at month 3 has cumulative target "0.00" and no status
    And the performance milestone at month 6 has cumulative target "500000.00" and status "UPCOMING"
    And the performance milestone at month 9 has cumulative target "1000000.00" and status "UPCOMING"
    And the performance milestone at month 12 has cumulative target "1000000.00" and status "UPCOMING"

  Scenario: Mismatched currencies disable judgments but keep actuals
    Given a currency value exists named "EUR"
    And a VAM agreement titled "Euro Cycle" in currency "EUR" exists for the agent "Web3 ME" sponsored by "industrial_platform"
    And the canvas of the VAM agreement "Euro Cycle" is replaced with the performance canvas
    And the VAM agreement "Euro Cycle" is activated with a start date 7 months ago
    And an invoice exists from "Web3 ME" to "Acme Client" issued 1 months after the start of "Euro Cycle" amount "300000"
    When I request the performance of the VAM agreement "Euro Cycle"
    Then the response status should be 200
    And the performance comparability is "CURRENCY_MISMATCH"
    And the performance milestone at month 6 has cumulative target "500000.00" and no status
    And the performance monthly actuals have 8 entries with final cumulative "300000.00"

  Scenario: A canvas without revenue amounts is not measurable
    Given the canvas of the VAM agreement "Web 3 Consulting HUB" is replaced with the minimal canvas
    And the VAM agreement "Web 3 Consulting HUB" is activated with a start date 1 months ago
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 200
    And the performance comparability is "NO_MEASURABLE_TARGETS"
    And the performance milestone at month 3 has cumulative target "0.00" and no status

  Scenario: Performance is unavailable for drafts and unknown agreements
    When I request the performance of the VAM agreement "Web 3 Consulting HUB"
    Then the response status should be 409
    When I request the performance of an unknown VAM agreement
    Then the response status should be 404
