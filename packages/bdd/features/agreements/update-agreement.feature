Feature: Update Agreement

  Scenario: Successfully update an agreement's title
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Trade Agreement"
    When I update the agreement's title to "Updated Agreement"
    Then the response status should be 200
    And the response should contain an agreement with title "Updated Agreement"

  Scenario: Successfully update an agreement's parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And an agent exists with name "Party C"
    And a root agreement exists with title "Trade Agreement"
    When I update the agreement's parties to "Party B" and "Party C"
    Then the response status should be 200
    And the response should contain 2 parties

  Scenario: Updating with fewer than 2 parties fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Trade Agreement"
    When I update the agreement's parties to 1 party
    Then the response status should be 400

  Scenario: Update a non-existent agreement returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the agreement with ID "00000000-0000-0000-0000-000000000000" with title "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the agreement with ID "00000000-0000-0000-0000-000000000000" with title "Test"
    Then the response status should be 401
