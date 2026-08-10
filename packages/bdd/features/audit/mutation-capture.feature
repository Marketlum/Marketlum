Feature: Audit trail captures entity mutations

  Scenario: A human's create is attributed
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with name "Audit Corp" and type "organization"
    Then the latest audit entry has category "mutation" and action "created" for that actor
    And the audit entry is attributed to the human "admin@marketlum.com"

  Scenario: A human's update is attributed
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Audit Corp" and type "organization"
    When I rename the actor to "Audit Corp Renamed"
    Then the latest audit entry has category "mutation" and action "updated" for that actor
    And the audit entry is attributed to the human "admin@marketlum.com"

  Scenario: A human's delete is attributed
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Audit Corp" and type "organization"
    When I delete the actor
    Then the latest audit entry has category "mutation" and action "deleted" for that actor
    And the audit entry is attributed to the human "admin@marketlum.com"

  Scenario: An agent's API-keyed mutation is attributed to the agent and its key
    Given an agent user with an "actors:write" role and a provisioned API key named "bot-key"
    When the agent creates an actor named "Bot Made Corp" via the REST API
    Then the latest audit entry has category "mutation" and action "created" for that actor
    And the audit entry is attributed to the agent with API key "bot-key"
