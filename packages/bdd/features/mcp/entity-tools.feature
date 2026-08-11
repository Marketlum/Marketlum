Feature: MCP entity tools for values, tensions, agreements, offerings, taxonomies

  Scenario: Create and fetch a value
    Given an MCP API key with grants "values:read, values:write"
    When the agent calls create_value with code "mcp_widget", name "MCP Widget" and type "product"
    Then the tool call succeeds
    And the agent can get_value for the created id and sees name "MCP Widget"

  Scenario: Update a value
    Given an MCP API key with grants "values:read, values:write"
    And the agent created a value with code "mcp_widget", name "MCP Widget" and type "product"
    When the agent calls update_value renaming it to "MCP Widget v2"
    Then the tool call succeeds
    And the agent can get_value for the created id and sees name "MCP Widget v2"

  Scenario: Search values
    Given an MCP API key with grants "values:read, values:write"
    And the agent created a value with code "mcp_widget", name "MCP Widget" and type "product"
    When the agent calls search_values searching for "MCP Widget"
    Then the tool call succeeds
    And the search result envelope contains an entry named "MCP Widget"

  Scenario: Writing without the write grant is forbidden
    Given an MCP API key with grants "values:read"
    When the agent calls create_value with code "mcp_widget", name "MCP Widget" and type "product"
    Then the tool call fails with error code "FORBIDDEN"

  Scenario: A created tension starts alive
    Given an MCP API key with grants "tensions:read, tensions:write" and a market actor
    When the agent calls create_tension named "Latency too high" for that actor
    Then the tool call succeeds
    And the created tension is in state "alive"

  Scenario: Offering state cannot be set through MCP
    Given an MCP API key with grants "offerings:read, offerings:write"
    When the agent calls create_offering named "MCP Bundle" requesting state "active"
    Then the tool call succeeds
    And the created offering is in state "draft"

  Scenario: Create and update an agreement between two actors
    Given an MCP API key with grants "agreements:read, agreements:write" and two market actors
    When the agent calls create_agreement titled "MCP Pact" between the two actors
    Then the tool call succeeds
    When the agent calls update_agreement retitling it to "MCP Pact v2"
    Then the tool call succeeds
    And the agent can get_agreement for the created id and sees title "MCP Pact v2"

  Scenario: Create a taxonomy under a parent
    Given an MCP API key with grants "taxonomies:read, taxonomies:write"
    And the agent created a taxonomy with code "mcp_root" and name "MCP Root"
    When the agent calls create_taxonomy with code "mcp_child", name "MCP Child" under the created taxonomy
    Then the tool call succeeds
    And "MCP Child" is a child of "MCP Root" in the taxonomy tree

  Scenario: MCP writes are captured in the audit trail
    Given an MCP API key with grants "values:read, values:write"
    When the agent calls create_value with code "mcp_widget", name "MCP Widget" and type "product"
    Then the audit trail records an mcp_call entry for "create_value"
    And the audit trail records a mutation entry for the created value attributed to the agent
