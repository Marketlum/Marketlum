Feature: Invoice rate snapshot

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a value exists named "USD"
    And a value exists named "EUR"
    And a value exists named "GBP"
    And the system base value is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2"

  Scenario: Invoice items in the base currency snapshot at rate 1
    When I create an invoice in "USD" with one item totalling "100"
    Then the response status should be 201
    And the item rateUsed should be "1.0000000000"
    And the item baseAmount should be "100.00"
    And the invoice baseTotal should be "100.00"

  Scenario: Invoice items in a non-base currency snapshot using the inverse rate
    When I create an invoice in "EUR" with one item totalling "100"
    Then the response status should be 201
    And the item rateUsed should be "0.5000000000"
    And the item baseAmount should be "50.00"
    And the invoice baseTotal should be "50.00"

  Scenario: Invoice items in a currency with no rate snapshot as NULL
    When I create an invoice in "GBP" with one item totalling "100"
    Then the response status should be 201
    And the item rateUsed should be null
    And the item baseAmount should be null
    And the invoice baseTotal should be null

  Scenario: Changing the invoice currency re-snapshots existing items
    Given I created an invoice in "USD" with one item totalling "100"
    When I update the invoice currency to "EUR"
    Then the response status should be 200
    And the item rateUsed should be "0.5000000000"
    And the item baseAmount should be "50.00"

  Scenario: Resending items re-snapshots each item against the invoice currency
    Given I created an invoice in "EUR" with one item totalling "100"
    When I update the invoice items so one item totals "40"
    Then the response status should be 200
    And the item rateUsed should be "0.5000000000"
    And the item baseAmount should be "20.00"

  Scenario: Editing pure metadata leaves the snapshot untouched
    Given I created an invoice in "EUR" with one item totalling "100"
    When I update the invoice paid flag without resending items
    Then the response status should be 200
    And the item rateUsed should be "0.5000000000"
    And the item baseAmount should be "50.00"
