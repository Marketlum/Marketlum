Feature: Create Actor

  Scenario: Successfully create a new actor
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
    Then the response status should be 201
    And the response should contain an actor with name "Actor One"
    And the response should contain an actor with type "organization"

  Scenario: Successfully create an AI agent actor
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with:
      | name         | type  | purpose                     |
      | Pricing Bot  | agent | An AI agent pricing actor   |
    Then the response status should be 201
    And the response should contain an actor with name "Pricing Bot"
    And the response should contain an actor with type "agent"

  Scenario: Successfully create an actor with contact details
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with email "hello@contact.example" and website "https://contact.example"
    Then the response status should be 201
    And the response should contain an actor with email "hello@contact.example"
    And the response should contain an actor with website "https://contact.example"

  Scenario: Creating an actor with an invalid email fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with email "not-an-email" and website "https://contact.example"
    Then the response status should be 400

  Scenario: Creating an actor with an invalid website fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with email "hello@contact.example" and website "not-a-url"
    Then the response status should be 400

  Scenario: Creating an actor with invalid data fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with:
      | name | type    | purpose |
      |      | invalid |             |
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create an actor with:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
    Then the response status should be 401
