Feature: Recurring Flow CSV Export

  Scenario: Export recurring flows as CSV
    Given I am authenticated
    And 2 recurring flows exist
    When I export recurring flows as CSV
    Then the response status should be 200
    And the response Content-Type should contain "text/csv"
    And the CSV response should have 3 lines
