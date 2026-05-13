Feature: Agreement value stream scoping

  Scenario: Create an agreement with a value stream reference
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme" exists
    And an agent "Beta" exists
    And a value stream "Platform" exists
    When I create an agreement titled "MSA" between "Acme" and "Beta" with value stream "Platform"
    Then the response status should be 201
    And the response should expose the value stream "Platform" on the agreement

  Scenario: Update an agreement to attach a value stream
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme" exists
    And an agent "Beta" exists
    And a value stream "Platform" exists
    And an agreement titled "MSA" between "Acme" and "Beta" exists with no value stream
    When I update the agreement to set value stream "Platform"
    Then the response status should be 200
    And the response should expose the value stream "Platform" on the agreement

  Scenario: Update an agreement to clear its value stream
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme" exists
    And an agent "Beta" exists
    And a value stream "Platform" exists
    And an agreement titled "MSA" between "Acme" and "Beta" exists with value stream "Platform"
    When I clear the value stream on the agreement
    Then the response status should be 200
    And the agreement value stream should be null

  Scenario: Search agreements filtered by value stream
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme" exists
    And an agent "Beta" exists
    And a value stream "Platform" exists
    And a value stream "Marketing" exists
    And an agreement titled "MSA Platform" between "Acme" and "Beta" exists with value stream "Platform"
    And an agreement titled "MSA Marketing" between "Acme" and "Beta" exists with value stream "Marketing"
    When I search agreements filtered by value stream "Platform"
    Then the response status should be 200
    And the response should contain 1 agreement

  Scenario: Deleting the referenced value stream nulls the FK
    Given I am authenticated as "admin@marketlum.com"
    And an agent "Acme" exists
    And an agent "Beta" exists
    And a value stream "Platform" exists
    And an agreement titled "MSA" between "Acme" and "Beta" exists with value stream "Platform"
    When I delete the value stream "Platform"
    And I fetch the agreement
    Then the response status should be 200
    And the agreement value stream should be null
