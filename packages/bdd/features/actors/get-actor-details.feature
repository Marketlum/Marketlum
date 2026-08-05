Feature: Get Actor Details

  Scenario: Get actor with all fields populated
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "actor-avatar.png"
    And a taxonomy exists with name "Main Category"
    And a taxonomy exists with name "Tag A"
    And a taxonomy exists with name "Tag B"
    And an actor exists with name "Detail Actor" and type "organization" and purpose "Test purpose" and image "actor-avatar.png" and main taxonomy "Main Category" and general taxonomies "Tag A, Tag B"
    When I request the actor details by their ID
    Then the response status should be 200
    And the response should contain id
    And the response should contain name "Detail Actor"
    And the response should contain type "organization"
    And the response should contain purpose "Test purpose"
    And the response should include image "actor-avatar.png"
    And the response should include main taxonomy "Main Category"
    And the response should include general taxonomies "Tag A, Tag B"
    And the response should contain createdAt
    And the response should contain updatedAt

  Scenario: Get actor details with ancestors
    Given I am authenticated as "admin@marketlum.com"
    And a root actor exists with name "Acme Holding" and type "organization"
    And an actor exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an actor exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the actor details of "Sarah Palmer"
    Then the response status should be 200
    And the response should include parent "Acme Poland"
    And the response should include ancestors "Acme Holding, Acme Poland"

  Scenario: Get a non-existent actor returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an actor with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
