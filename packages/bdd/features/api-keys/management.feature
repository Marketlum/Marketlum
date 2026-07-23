Feature: API Key Management

  Scenario: Creating an API key reveals the plaintext key once
    Given I am authenticated as "admin@marketlum.com"
    When I create an API key named "Zapier integration"
    Then the response status should be 201
    And the response should contain a plaintext key starting with "mlm_"
    And the response should contain the key name "Zapier integration"

  Scenario: Listing API keys never exposes the key or its hash
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Zapier integration"
    When I list my API keys
    Then the response status should be 200
    And the list should contain a key named "Zapier integration" with a prefix starting with "mlm_"
    And the list should not expose plaintext keys or hashes

  Scenario: Listing API keys only shows my own keys
    Given I am authenticated as "admin@marketlum.com"
    And another user "other@marketlum.com" has an API key named "Other key"
    And I have created an API key named "My key"
    When I list my API keys
    Then the response status should be 200
    And the list should contain a key named "My key"
    And the list should not contain a key named "Other key"

  Scenario: Deleting my API key
    Given I am authenticated as "admin@marketlum.com"
    And I have created an API key named "Zapier integration"
    When I delete that API key
    Then the response status should be 204
    And my API key list should be empty

  Scenario: Deleting another user's API key returns 404
    Given I am authenticated as "admin@marketlum.com"
    And another user "other@marketlum.com" has an API key named "Other key"
    When I delete the other user's API key
    Then the response status should be 404

  Scenario: Creating an API key with an empty name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an API key with an empty name
    Then the response status should be 400

  Scenario: Creating an API key with a past expiration date fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an API key expiring in the past
    Then the response status should be 400
