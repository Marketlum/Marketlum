Feature: Get Exchange

  Scenario: Get an existing exchange by ID
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And an exchange exists with name "Trade Deal"
    When I request the exchange by its ID
    Then the response status should be 200
    And the response should contain an exchange with name "Trade Deal"
    And the response should contain 2 parties
    And the response should contain a party with agent "Seller Corp"
    And the response should contain a party with agent "Buyer Inc"

  Scenario: Get a non-existent exchange returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an exchange with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an exchange with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
