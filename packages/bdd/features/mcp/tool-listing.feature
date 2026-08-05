Feature: MCP Tool Listing

  Scenario: An administrator sees the full tool catalog
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I list the MCP tools using the API key
    Then the MCP tool list should contain exactly 11 tools

  Scenario: A scoped role sees only the tools its permissions allow
    Given a user "analyst@marketlum.com" with a role granting "search:read, invoices:read"
    And that user has created an API key named "Analyst"
    When I list the MCP tools using the API key
    Then the MCP tool list should be exactly "search_market, search_invoices, get_invoice"

  Scenario: A user with no read permissions sees no tools
    Given a user "writer@marketlum.com" with a role granting "invoices:create"
    And that user has created an API key named "Writer"
    When I list the MCP tools using the API key
    Then the MCP tool list should be empty
