Feature: Agent User to Actor Link

  Scenario: Link an agent user to an agent-type actor
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Acme Pricing Agent" and type "agent"
    When I create an agent user with name "Pricing Bot", email "pricing-bot@marketlum.com" and the actor as its market identity
    Then the response status should be 201
    And the response should contain a user linked to the actor

  Scenario: Linking to a non-agent actor fails
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Acme Corp" and type "organization"
    When I create an agent user with name "Pricing Bot", email "pricing-bot@marketlum.com" and the actor as its market identity
    Then the response status should be 400

  Scenario: Deleting the linked actor clears the link
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Acme Pricing Agent" and type "agent"
    And an agent user exists with name "Pricing Bot", email "pricing-bot@marketlum.com" and the actor as its market identity
    When I delete the actor
    And I fetch the user
    Then the response status should be 200
    And the response should contain a user with no linked actor
