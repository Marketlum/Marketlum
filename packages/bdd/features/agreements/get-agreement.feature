Feature: Get Agreement

  Scenario: Get an existing agreement by ID
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Trade Agreement"
    When I request the agreement by its ID
    Then the response status should be 200
    And the response should contain an agreement with title "Trade Agreement"
    And the response should contain 2 parties

  Scenario: Get a non-existent agreement returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an agreement with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an agreement with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
