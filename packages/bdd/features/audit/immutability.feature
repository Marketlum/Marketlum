Feature: Audit entries are immutable

  Scenario: Audit entries cannot be modified or deleted through the API
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Immutable Proof" and type "organization"
    When I attempt to modify and delete the latest audit entry
    Then both attempts are rejected as unknown routes
