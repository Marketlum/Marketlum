Feature: Invoice market

  Every invoice records which market it belongs to: "internal" for invoices
  between entities of the own organization, "external" for invoices with
  outside counterparties. The market is a recorded attribute only — it does
  not drive any aggregation. When omitted at creation it defaults to
  "external".

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"

  Scenario: Create an internal market invoice
    When I create an invoice with number "INV-INT" and market "internal"
    Then the response status should be 201
    And the response invoice market should be "internal"

  Scenario: Create an external market invoice
    When I create an invoice with number "INV-EXT" and market "external"
    Then the response status should be 201
    And the response invoice market should be "external"

  Scenario: Market defaults to external when omitted
    When I create an invoice with number "INV-DEF" and no market
    Then the response status should be 201
    And the response invoice market should be "external"

  Scenario: Reject an invalid market value
    When I create an invoice with number "INV-BAD" and market "sideways"
    Then the response status should be 400

  Scenario: Update an invoice's market
    Given an invoice exists with number "INV-UPD" and market "external"
    When I update the invoice's market to "internal"
    Then the response status should be 200
    And the response invoice market should be "internal"

  Scenario: Filter invoices by market
    Given an invoice exists with number "INV-I1" and market "internal"
    And an invoice exists with number "INV-E1" and market "external"
    And an invoice exists with number "INV-E2" and market "external"
    When I search invoices with market "external"
    Then the response status should be 200
    And the total count should be 2
