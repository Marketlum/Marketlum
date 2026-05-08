Feature: Download Exchange PDF

  Scenario: Download PDF for an exchange
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Agent A"
    And an agent exists with name "Agent B"
    And an exchange exists with name "Pricing Sync"
    When I download the exchange PDF
    Then the response status should be 200
    And the response Content-Type should be "application/pdf"
    And the response Content-Disposition should contain "attachment"
    And the response Content-Disposition should contain "exchange-pricing-sync.pdf"
    And the response body should be a non-empty PDF

  Scenario: Non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I download the exchange PDF for ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I download the exchange PDF for ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
