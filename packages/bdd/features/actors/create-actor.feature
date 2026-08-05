Feature: Create Actor

  Scenario: Successfully create a new actor
    Given I am authenticated as "admin@marketlum.com"
    When I create an actor with:
      | name       | type         | purpose           |
      | Actor One  | organization | An organization actor |
    Then the response status should be 201
    And the response should contain an actor with name "Actor One"
    And the response should contain an actor with type "organization"

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
