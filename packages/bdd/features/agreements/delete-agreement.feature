Feature: Delete Agreement

  Scenario: Successfully delete a leaf agreement
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Trade Agreement"
    When I delete the agreement
    Then the response status should be 204

  Scenario: Delete an agreement with children cascades
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And the following agreement tree exists:
      | title              | parent             |
      | Master Agreement   |                    |
      | Sub Agreement      | Master Agreement   |
      | Deep Sub           | Sub Agreement      |
    When I delete the agreement "Master Agreement"
    Then the response status should be 204
    And the agreement "Sub Agreement" should not exist
    And the agreement "Deep Sub" should not exist

  Scenario: Delete a non-existent agreement returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the agreement with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the agreement with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
