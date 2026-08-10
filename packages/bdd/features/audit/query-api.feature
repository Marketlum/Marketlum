Feature: Audit trail query API

  Scenario: Filter by actor kind
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Human Made" and type "organization"
    When I list audit entries filtered by actor kind "human"
    Then the response status should be 200
    And every returned audit entry has actor kind "human"

  Scenario: Filter by entity
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Filter Target" and type "organization"
    When I list audit entries for that actor entity
    Then the response status should be 200
    And every returned audit entry references that actor

  Scenario: Text search matches the actor email
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Search Target" and type "organization"
    When I search audit entries for "admin@marketlum.com"
    Then the response status should be 200
    And the audit list is not empty

  Scenario: Reading the audit trail requires the audit permission
    Given a user without audit permissions is authenticated
    When I list audit entries
    Then the response status should be 403
