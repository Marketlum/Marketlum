Feature: Get Agent Details

  Scenario: Get agent with all fields populated
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "agent-avatar.png"
    And a taxonomy exists with name "Main Category"
    And a taxonomy exists with name "Tag A"
    And a taxonomy exists with name "Tag B"
    And an agent exists with name "Detail Agent" and type "organization" and purpose "Test purpose" and image "agent-avatar.png" and main taxonomy "Main Category" and general taxonomies "Tag A, Tag B"
    When I request the agent details by their ID
    Then the response status should be 200
    And the response should contain id
    And the response should contain name "Detail Agent"
    And the response should contain type "organization"
    And the response should contain purpose "Test purpose"
    And the response should include image "agent-avatar.png"
    And the response should include main taxonomy "Main Category"
    And the response should include general taxonomies "Tag A, Tag B"
    And the response should contain createdAt
    And the response should contain updatedAt

  Scenario: Get agent details with ancestors
    Given I am authenticated as "admin@marketlum.com"
    And a root agent exists with name "Acme Holding" and type "organization"
    And an agent exists with name "Acme Poland" and type "organization" under parent "Acme Holding"
    And an agent exists with name "Sarah Palmer" and type "individual" under parent "Acme Poland"
    When I request the agent details of "Sarah Palmer"
    Then the response status should be 200
    And the response should include parent "Acme Poland"
    And the response should include ancestors "Acme Holding, Acme Poland"

  Scenario: Get a non-existent agent returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an agent with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
