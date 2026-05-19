Feature: Value stream agent owner

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists named "Owning Co"
    And an agent exists named "Other Co"

  Scenario: Creating a value stream with an owning agent
    When I create a value stream named "Platform" with agent "Owning Co"
    Then the response status should be 201
    And the value stream agent should be "Owning Co"

  Scenario: Creating a value stream without an agent is allowed
    When I create a value stream named "Bare Stream" without an agent
    Then the response status should be 201
    And the value stream agent should be null

  Scenario: Updating a value stream's agent
    Given a value stream exists named "Platform" with agent "Owning Co"
    When I update that stream's agent to "Other Co"
    Then the response status should be 200
    And the value stream agent should be "Other Co"

  Scenario: Child value stream does not inherit agent from parent
    Given a value stream exists named "Platform" with agent "Owning Co"
    When I create a value stream named "Frontend" under "Platform" without an agent
    Then the response status should be 201
    And the value stream agent should be null
