Feature: Legal-entity invoice enforcement

  Only agents that are legal entities may issue external invoices. Legal
  status is derived from the agent type: "virtual" agents are not legal
  entities, "organization" and "individual" agents are. The rule is enforced
  on create and on any update that touches the issuer or the market;
  pre-existing rows are not re-checked until touched.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an agent exists named "Holding Corp" of type "organization"
    And an agent exists named "Studio" of type "virtual" under parent "Holding Corp"
    And an agent exists named "Customer Inc" of type "organization"

  Scenario: A virtual agent cannot issue an external invoice
    When I create an external invoice numbered "EXT-1" from "Studio" to "Customer Inc"
    Then the response status should be 422

  Scenario: An organization can issue an external invoice
    When I create an external invoice numbered "EXT-2" from "Holding Corp" to "Customer Inc"
    Then the response status should be 201

  Scenario: A virtual agent can issue an internal invoice
    When I create an internal invoice numbered "INT-1" from "Studio" to "Holding Corp"
    Then the response status should be 201

  Scenario: Updating an external invoice's issuer to a virtual agent is rejected
    Given an external invoice exists numbered "EXT-3" from "Holding Corp" to "Customer Inc"
    When I update the invoice's from agent to "Studio"
    Then the response status should be 422

  Scenario: Switching an internal invoice with a virtual issuer to external is rejected
    Given an internal invoice exists numbered "INT-2" from "Studio" to "Holding Corp"
    When I update the invoice's market to "external"
    Then the response status should be 422
