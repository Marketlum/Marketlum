Feature: Agent API keys work on MCP

  Scenario: An agent's API key calls MCP tools under its role grants
    Given an agent user with an "actors:read" role and a provisioned API key
    And an actor exists with name "Acme Corp" and type "organization"
    When the agent calls the "search_actors" MCP tool searching for "Acme"
    Then the MCP tool call succeeds
    And the MCP result contains the actor "Acme Corp"
