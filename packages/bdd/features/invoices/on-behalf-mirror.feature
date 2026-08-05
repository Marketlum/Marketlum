Feature: On-behalf-of invoices and mirrors

  An external invoice may be issued by a legal entity on behalf of one of
  its virtual descendants. The system then generates a linked internal
  mirror invoice from the descendant to the issuer carrying the same
  economics, so the descendant's P&L is correct. Mirrors are system-owned
  and read-only: they are regenerated wholesale on every source update and
  removed together with the source.

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And an actor exists named "Holding Corp" of type "organization" with functional currency "USD"
    And an actor exists named "Studio" of type "virtual" with functional currency "USD" under parent "Holding Corp"
    And an actor exists named "Customer Inc" of type "organization" with functional currency "USD"

  Scenario: Creating an on-behalf invoice generates an internal mirror
    When I create an external invoice numbered "FV-12" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    Then the response status should be 201
    And the response invoice on-behalf actor should be "Studio"
    And the response invoice should link a mirror numbered "MIR-FV-12"
    And the mirror invoice should be internal from "Studio" to "Holding Corp"
    And the mirror invoice should copy the source dates, currency and paid flag
    And the mirror invoice items should total "100.00"
    And the mirror invoice should have no file, link, channel or order

  Scenario: Mirror items are snapshotted in the sub-actor's functional currency
    Given a currency value exists named "EUR"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"
    And an actor exists named "Euro Studio" of type "virtual" with functional currency "EUR" under parent "Holding Corp"
    When I create an external invoice numbered "FV-20" from "Holding Corp" to "Customer Inc" on behalf of "Euro Studio" with an item totalling "100.00"
    Then the response status should be 201
    And the mirror invoice from-actor total should be "200.00"

  Scenario: On-behalf is rejected on internal invoices
    When I create an internal invoice numbered "INT-9" from "Holding Corp" to "Customer Inc" on behalf of "Studio"
    Then the response status should be 422

  Scenario: The on-behalf actor must not be a legal entity
    Given an actor exists named "Branch Ltd" of type "organization" with functional currency "USD" under parent "Holding Corp"
    When I create an external invoice numbered "FV-21" from "Holding Corp" to "Customer Inc" on behalf of "Branch Ltd"
    Then the response status should be 422

  Scenario: The on-behalf actor must be a descendant of the issuer
    Given an actor exists named "Stray" of type "virtual" with functional currency "USD"
    When I create an external invoice numbered "FV-22" from "Holding Corp" to "Customer Inc" on behalf of "Stray"
    Then the response status should be 422

  Scenario: A mirror number collision is rejected
    Given an internal invoice exists numbered "MIR-FV-30" from "Studio" to "Holding Corp"
    When I create an external invoice numbered "FV-30" from "Holding Corp" to "Customer Inc" on behalf of "Studio"
    Then the response status should be 409

  Scenario: Updating the source regenerates the mirror
    Given an external invoice exists numbered "FV-40" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I update the invoice items to a single item totalling "250.00"
    Then the response status should be 200
    And the mirror invoice items should total "250.00"

  Scenario: Marking the source paid propagates to the mirror
    Given an external invoice exists numbered "FV-41" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I update the invoice as paid
    Then the response status should be 200
    And the mirror invoice should be paid

  Scenario: Clearing on-behalf deletes the mirror
    Given an external invoice exists numbered "FV-42" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I clear the invoice's on-behalf actor
    Then the response status should be 200
    And the response invoice should have no mirror
    And no mirror invoice numbered "MIR-FV-42" should exist

  Scenario: Deleting the source deletes the mirror
    Given an external invoice exists numbered "FV-43" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I delete the invoice
    Then the response status should be 204
    And no mirror invoice numbered "MIR-FV-43" should exist

  Scenario: A mirror cannot be updated directly
    Given an external invoice exists numbered "FV-44" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I attempt to update the mirror invoice
    Then the response status should be 422

  Scenario: A mirror cannot be deleted directly
    Given an external invoice exists numbered "FV-45" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I attempt to delete the mirror invoice
    Then the response status should be 422

  Scenario: Search can exclude mirrors
    Given an external invoice exists numbered "FV-46" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I search invoices with mirror filter "exclude"
    Then the response status should be 200
    And the total count should be 1
    And the search results should contain number "FV-46"

  Scenario: Search can return only mirrors
    Given an external invoice exists numbered "FV-47" from "Holding Corp" to "Customer Inc" on behalf of "Studio" with an item totalling "100.00"
    When I search invoices with mirror filter "only"
    Then the response status should be 200
    And the total count should be 1
    And the search results should contain number "MIR-FV-47"
    And each search result should reference source invoice number "FV-47"
