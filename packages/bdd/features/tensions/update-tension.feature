Feature: Update Tension

  Scenario: Update all fields
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Original Agent"
    And an agent exists with name "New Agent"
    And a user exists with name "New Lead"
    And a tension exists with name "Updatable Tension"
    When I update the tension "Updatable Tension" with:
      | name            | currentContext | potentialFuture | score |
      | Updated Tension | New context    | New future      | 9     |
    Then the response status should be 200
    And the response should contain a tension with name "Updated Tension"
    And the response should contain a tension with score 9
    And the response should contain an agent with name "New Agent"
    And the response should contain a lead with name "New Lead"

  Scenario: Partial update only name
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Partial Agent"
    And a tension exists with name "Partial Tension" with score 7
    When I update the tension "Partial Tension" with name "Renamed Tension"
    Then the response status should be 200
    And the response should contain a tension with name "Renamed Tension"
    And the response should contain a tension with score 7

  Scenario: Update with invalid score fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Score Agent"
    And a tension exists with name "Score Tension"
    When I update the tension "Score Tension" with score 15
    Then the response status should be 400

  Scenario: Update with non-existent agentId fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Exist Agent"
    And a tension exists with name "Agent Tension"
    When I update the tension "Agent Tension" with non-existent agentId
    Then the response status should be 404

  Scenario: Update with non-existent leadUserId fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Lead Agent"
    And a tension exists with name "Lead Tension"
    When I update the tension "Lead Tension" with non-existent leadUserId
    Then the response status should be 404
