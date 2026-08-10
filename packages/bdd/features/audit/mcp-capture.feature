Feature: Audit trail captures MCP tool calls

  Scenario: A successful tool call is logged with its arguments
    Given an agent user with an "actors:read" role and a provisioned API key named "bot-key"
    When the agent calls the "search_actors" MCP tool searching for "Acme"
    Then the latest audit entry has category "mcp_call" and action "search_actors"
    And the audit entry context records the search arguments and outcome "ok"
    And the audit entry is attributed to the agent with API key "bot-key"

  Scenario: A failed tool call is logged with its error code
    Given an agent user with an "actors:read" role and a provisioned API key named "bot-key"
    When the agent calls the "get_actor" MCP tool with a malformed id
    Then the latest audit entry has category "mcp_call" and action "get_actor"
    And the audit entry context records outcome "error"
