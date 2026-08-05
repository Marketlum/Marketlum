Feature: Create Tension

  Scenario: Create tension with all fields
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Acme Corp"
    And a user exists with name "Jane Lead"
    When I create a tension with:
      | name             | currentContext          | potentialFuture        | score |
      | Market Gap Alpha | Current state is poor   | Future could be great  | 8     |
    Then the response status should be 201
    And the response should contain a tension with name "Market Gap Alpha"
    And the response should contain a tension with score 8
    And the response should contain an actor with name "Acme Corp"
    And the response should contain a lead with name "Jane Lead"

  Scenario: Create tension with minimal fields defaults score to 5
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Beta Inc"
    When I create a tension with name "Simple Tension" and actor "Beta Inc"
    Then the response status should be 201
    And the response should contain a tension with name "Simple Tension"
    And the response should contain a tension with score 5

  Scenario: Create tension with missing name fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Gamma Ltd"
    When I create a tension without a name
    Then the response status should be 400

  Scenario: Create tension with missing actorId fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a tension without an actorId
    Then the response status should be 400

  Scenario: Create tension with non-existent actorId fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a tension with non-existent actorId
    Then the response status should be 404

  Scenario: Create tension with non-existent leadUserId fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Delta Corp"
    When I create a tension with non-existent leadUserId
    Then the response status should be 404

  Scenario: Create tension with score outside range fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Epsilon Ltd"
    When I create a tension with score 11
    Then the response status should be 400

  Scenario: Create tension with score zero fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Zeta Corp"
    When I create a tension with score 0
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a tension without authentication
    Then the response status should be 401
