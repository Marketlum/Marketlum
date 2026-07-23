Feature: API Key Authentication

  Scenario: A valid API key authenticates a protected endpoint as its owner
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "CLI"
    When I request the current user using the API key
    Then the response status should be 200
    And the current user email should be "admin@marketlum.com"

  Scenario: An unknown API key is rejected
    When I request the current user using the API key "mlm_unknown0000000000000000000000000000000000"
    Then the response status should be 401

  Scenario: A malformed bearer token is rejected
    When I request the current user using the API key "not-an-api-key"
    Then the response status should be 401

  Scenario: An expired API key is rejected
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Expired key"
    And that API key has expired
    When I request the current user using the API key
    Then the response status should be 401

  Scenario: A deleted API key stops working immediately
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Doomed key"
    And I delete that API key
    When I request the current user using the API key
    Then the response status should be 401

  Scenario: A mutation with an API key succeeds without a CSRF header
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Writer"
    When I create a value using the API key without a CSRF header
    Then the response status should be 201

  Scenario: An API key cannot manage API keys
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Sneaky key"
    When I list API keys using the API key
    Then the response status should be 401

  Scenario: Using an API key records when it was last used
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Tracked key"
    And the key has never been used
    When I request the current user using the API key
    Then the response status should be 200
    And the key should have a last used timestamp

  Scenario: Cookie session authentication continues to work
    Given I am authenticated as "admin@marketlum.com"
    When I request the current user using my session cookie
    Then the response status should be 200
    And the current user email should be "admin@marketlum.com"
