Feature: Legal-entity invoice enforcement

  Only actors that are legal entities may issue external invoices. Legal
  status is derived from the actor type: "virtual" actors are not legal
  entities, "organization" and "individual" actors are. The rule is enforced
  on create and on any update that touches the issuer or the market;
  pre-existing rows are not re-checked until touched.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an actor exists named "Holding Corp" of type "organization"
    And an actor exists named "Studio" of type "virtual" under parent "Holding Corp"
    And an actor exists named "Customer Inc" of type "organization"

  Scenario: A virtual actor cannot issue an external invoice
    When I create an external invoice numbered "EXT-1" from "Studio" to "Customer Inc"
    Then the response status should be 422

  Scenario: An organization can issue an external invoice
    When I create an external invoice numbered "EXT-2" from "Holding Corp" to "Customer Inc"
    Then the response status should be 201

  Scenario: A virtual actor can issue an internal invoice
    When I create an internal invoice numbered "INT-1" from "Studio" to "Holding Corp"
    Then the response status should be 201

  Scenario: Updating an external invoice's issuer to a virtual actor is rejected
    Given an external invoice exists numbered "EXT-3" from "Holding Corp" to "Customer Inc"
    When I update the invoice's from actor to "Studio"
    Then the response status should be 422

  Scenario: Switching an internal invoice with a virtual issuer to external is rejected
    Given an internal invoice exists numbered "INT-2" from "Studio" to "Holding Corp"
    When I update the invoice's market to "external"
    Then the response status should be 422
