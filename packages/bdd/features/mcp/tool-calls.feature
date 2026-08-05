Feature: MCP Tool Calls

  Background:
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"

  Scenario: search_market returns the same payload as the REST search endpoint
    Given an agent named "Acme Corp" exists
    When I call the MCP tool "search_market" with arguments:
      """
      { "q": "Acme" }
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/search?q=Acme"

  Scenario: search_agents returns the same payload as the REST agents list
    Given an agent named "Acme Corp" exists
    And an agent named "Globex" exists
    When I call the MCP tool "search_agents" with arguments:
      """
      { "limit": 50 }
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/agents?limit=50"

  Scenario: get_agent returns the same payload as the REST agent detail
    Given an agent named "Acme Corp" exists
    When I call the MCP tool "get_agent" with the id of agent "Acme Corp"
    Then the tool call should succeed
    And the tool result should equal the REST response for the detail of agent "Acme Corp"

  Scenario: get_agent_financials returns the same payload as the REST agent financials
    Given an agent named "Acme Corp" exists
    When I call the MCP tool "get_agent_financials" for agent "Acme Corp" and year 2025
    Then the tool call should succeed
    And the tool result should equal the REST response for the 2025 financials of agent "Acme Corp"

  Scenario: search_invoices returns the same payload as the REST invoice search
    Given an invoice "INV-001" from "Seller" to "Buyer" exists
    When I call the MCP tool "search_invoices" with arguments:
      """
      { "limit": 50 }
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/invoices/search?limit=50"

  Scenario: get_invoice returns the same payload as the REST invoice detail
    Given an invoice "INV-001" from "Seller" to "Buyer" exists
    When I call the MCP tool "get_invoice" with the id of invoice "INV-001"
    Then the tool call should succeed
    And the tool result should equal the REST response for the detail of invoice "INV-001"

  Scenario: search_orders returns the same payload as the REST order search
    Given an order from "Seller" to "Buyer" exists
    When I call the MCP tool "search_orders" with arguments:
      """
      { "limit": 50 }
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/orders/search?limit=50"

  Scenario: get_order returns the same payload as the REST order detail
    Given an order from "Seller" to "Buyer" exists
    When I call the MCP tool "get_order" with the id of that order
    Then the tool call should succeed
    And the tool result should equal the REST response for the detail of that order

  Scenario: list_value_streams returns the same payload as the REST value-stream search
    Given a value stream named "Consulting" exists
    When I call the MCP tool "list_value_streams" with arguments:
      """
      { "limit": 50 }
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/value-streams/search?limit=50"

  Scenario: get_dashboard_summary returns the same payload as the REST dashboard summary
    When I call the MCP tool "get_dashboard_summary" with arguments:
      """
      {}
      """
    Then the tool call should succeed
    And the tool result should equal the REST response for "/dashboard/summary"

  Scenario: get_exchange_rate returns the same payload as the REST rate lookup
    Given currency values "USD" and "EUR" with an exchange rate of "4.25" exist
    When I call the MCP tool "get_exchange_rate" for values "USD" and "EUR"
    Then the tool call should succeed
    And the tool result should equal the REST response for the rate lookup from "USD" to "EUR"
