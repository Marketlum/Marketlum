Feature: MCP Protocol

  Scenario: An MCP client can initialize against the server
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I send an MCP "initialize" request using the API key
    Then the response status should be 200
    And the MCP result should identify the server as "marketlum"

  Scenario: An unknown JSON-RPC method returns a method-not-found error
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Agent"
    When I send an MCP request with method "bogus/method" using the API key
    Then the response status should be 200
    And the response should be a JSON-RPC error with code -32601

  Scenario: The MCP endpoint does not support GET
    When I send a GET request to the MCP endpoint
    Then the response status should be 405
