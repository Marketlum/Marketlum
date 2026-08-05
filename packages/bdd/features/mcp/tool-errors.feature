Feature: MCP Tool Errors

  Scenario: Calling a tool without its permission returns a FORBIDDEN error
    Given a user "analyst@marketlum.com" with a role granting "search:read"
    And that user has created an API key named "Analyst"
    When I call the MCP tool "search_invoices" with arguments:
      """
      {}
      """
    Then the tool call should fail with code "FORBIDDEN"

  Scenario: Fetching a missing entity returns a NOT_FOUND error
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I call the MCP tool "get_agent" with arguments:
      """
      { "id": "00000000-0000-0000-0000-000000000000" }
      """
    Then the tool call should fail with code "NOT_FOUND"

  Scenario: Invalid tool input returns an INVALID_INPUT error
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I call the MCP tool "search_market" with arguments:
      """
      {}
      """
    Then the tool call should fail with code "INVALID_INPUT"

  Scenario: A result limit above the maximum is rejected
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I call the MCP tool "search_agents" with arguments:
      """
      { "limit": 500 }
      """
    Then the tool call should fail with code "INVALID_INPUT"
