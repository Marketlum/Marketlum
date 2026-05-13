Feature: Recurring Flow Projection

  Scenario: Projection for an empty value stream
    Given I am authenticated
    And a value stream "Sales" exists
    When I get the projection for value stream "Sales" with horizon 6
    Then the response status should be 200
    And the projection should have 6 months

  Scenario: Projection for a stream with a monthly inbound flow
    Given I am authenticated
    And a value stream "Sales" exists
    And an active monthly recurring flow with amount "5000" and unit "USD" and direction "inbound" starting today exists for stream "Sales"
    When I get the projection for value stream "Sales" with horizon 3
    Then the response status should be 200
    And the projection should have 3 months
    And the first projection month should have inbound total "5000.0000" for unit "USD"

  Scenario: Projection caps horizon at 36 months
    Given I am authenticated
    And a value stream "Sales" exists
    When I get the projection for value stream "Sales" with horizon 100
    Then the response status should be 200
    And the projection horizon should be 36
