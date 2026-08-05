Feature: Invoice snapshot per actor

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And a currency value exists named "EUR"
    And the system presentation currency is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"

  Scenario: Cross-currency invoice writes both actor perspectives plus presentation
    Given an actor exists named "Acme" with functional currency "EUR"
    And an actor exists named "Globex" with functional currency "USD"
    When I create an invoice from "Acme" to "Globex" in "USD" with one item totalling "100"
    Then the response status should be 201
    And the item fromActorRate should be "2.0000000000"
    And the item fromActorAmount should be "200.00"
    And the item toActorRate should be "1.0000000000"
    And the item toActorAmount should be "100.00"
    And the item presentationRate should be "1.0000000000"
    And the item presentationAmount should be "100.00"

  Scenario: Same-currency invoice uses identity rate for both actors
    Given an actor exists named "Acme" with functional currency "USD"
    And an actor exists named "Globex" with functional currency "USD"
    When I create an invoice from "Acme" to "Globex" in "USD" with one item totalling "100"
    Then the response status should be 201
    And the item fromActorRate should be "1.0000000000"
    And the item toActorRate should be "1.0000000000"

  Scenario: Actor without functional currency leaves its perspective NULL
    Given an actor exists named "Acme" without a functional currency
    And an actor exists named "Globex" with functional currency "USD"
    When I create an invoice from "Acme" to "Globex" in "USD" with one item totalling "100"
    Then the response status should be 201
    And the item fromActorRate should be null
    And the item fromActorAmount should be null
    And the item toActorRate should be "1.0000000000"
    And the item toActorAmount should be "100.00"
