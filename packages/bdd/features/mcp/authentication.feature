Feature: MCP Authentication

  Scenario: A request without an API key is rejected
    When I send an MCP "tools/list" request without credentials
    Then the response status should be 401

  Scenario: A request with an unknown API key is rejected
    When I send an MCP "tools/list" request with the API key "mlm_unknown0000000000000000000000000000000000"
    Then the response status should be 401

  Scenario: A session cookie cannot authenticate the MCP endpoint
    Given I am authenticated as "admin@marketlum.com"
    When I send an MCP "tools/list" request using my session cookie
    Then the response status should be 401
