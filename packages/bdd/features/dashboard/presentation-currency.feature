Feature: Dashboard presentation currency aggregation

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And a currency value exists named "USD"
    And a currency value exists named "EUR"
    And the system presentation currency is "USD"
    And an exchange rate exists from "USD" to "EUR" with rate "2" effective "2020-01-01"
    And an agent exists named "Acme"
    And an agent exists named "Globex"

  Scenario: Dashboard sums invoice items using presentationAmount
    Given an invoice exists from "Acme" to "Globex" in "USD" totalling "100"
    When I fetch the dashboard summary
    Then the response status should be 200
    And the dashboard totalRevenue should be "100.00"
    And the dashboard notConvertedCount should be 0

  Scenario: Invoice items without a rate increment notConvertedCount
    Given a currency value exists named "GBP"
    And an invoice exists from "Acme" to "Globex" in "GBP" totalling "100"
    When I fetch the dashboard summary
    Then the response status should be 200
    And the dashboard notConvertedCount should be 1
