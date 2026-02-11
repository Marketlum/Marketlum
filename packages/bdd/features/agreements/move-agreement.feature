Feature: Move Agreement

  Scenario: Move an agreement to a different parent
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Standalone         |                    |
      | Sub Agreement      | Master Agreement   |
    When I move "Sub Agreement" to parent "Standalone"
    Then the response status should be 200
    And the children of "Standalone" should include "Sub Agreement"

  Scenario: Move an agreement to root
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement      | Master Agreement   |
    When I move "Sub Agreement" to root
    Then the response status should be 200
    And the root agreements should include "Sub Agreement"

  Scenario: Move to a non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Trade Agreement"
    When I move "Trade Agreement" to non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I move agreement with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 401
