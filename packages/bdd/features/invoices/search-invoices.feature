Feature: Search Invoices

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-003" from "Seller Corp" to "Buyer Inc"
    When I search invoices
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search by text
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "REC-001" from "Seller Corp" to "Buyer Inc"
    When I search invoices with search "INV"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by fromAgentId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller A"
    And an agent exists with name "Seller B"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller A" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller B" to "Buyer Inc"
    When I search invoices with fromAgentId for "Seller A"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Filter by toAgentId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer A"
    And an agent exists with name "Buyer B"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer A"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer B"
    When I search invoices with toAgentId for "Buyer A"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Filter by paid status
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc" with paid true
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-003" from "Seller Corp" to "Buyer Inc" with paid true
    When I search invoices with paid "true"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by currencyId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a value exists with name "EUR"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc" with currency "USD"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc" with currency "EUR"
    When I search invoices with currencyId for "USD"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Filter by channelId
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And a channel exists with name "Online Store"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc" with channel "Online Store"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    When I search invoices with channelId for "Online Store"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Sort by number ascending
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-003" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    When I search invoices sorted by "number" "ASC"
    Then the response status should be 200
    And the first invoice should have number "INV-001"

  Scenario: Default sort by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Seller Corp"
    And an agent exists with name "Buyer Inc"
    And a value exists with name "USD"
    And an invoice exists with number "INV-001" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-002" from "Seller Corp" to "Buyer Inc"
    And an invoice exists with number "INV-003" from "Seller Corp" to "Buyer Inc"
    When I search invoices
    Then the response status should be 200
    And the first invoice should have number "INV-003"

  Scenario: Unauthenticated request is rejected
    When I search invoices
    Then the response status should be 401
