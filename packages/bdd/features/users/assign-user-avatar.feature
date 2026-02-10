Feature: Assign Avatar to User

  Scenario: Create user with avatar
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "avatar.png"
    When I create a user with avatar "avatar.png" and:
      | name      | email              | password   |
      | User One  | user1@example.com  | password1  |
    Then the response status should be 201
    And the response should include avatar "avatar.png"

  Scenario: Create user with non-existent avatar
    Given I am authenticated as "admin@marketlum.com"
    When I create a user with a non-existent avatar and:
      | name      | email              | password   |
      | User Two  | user2@example.com  | password2  |
    Then the response status should be 404

  Scenario: Update user's avatar
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "avatar.png"
    And a file exists with name "photo.png"
    And a user exists with name "User Three" and email "user3@example.com" and avatar "avatar.png"
    When I update the user's avatar to "photo.png"
    Then the response status should be 200
    And the response should include avatar "photo.png"

  Scenario: Remove user's avatar
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "avatar.png"
    And a user exists with name "User Four" and email "user4@example.com" and avatar "avatar.png"
    When I update the user's avatar to null
    Then the response status should be 200
    And the response should have null avatar

  Scenario: Get user by ID includes avatar
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "avatar.png"
    And a user exists with name "User Five" and email "user5@example.com" and avatar "avatar.png"
    When I request the user by their ID
    Then the response status should be 200
    And the response should include avatar "avatar.png"

  Scenario: List users includes avatar data
    Given I am authenticated as "admin@marketlum.com"
    And a file exists with name "avatar.png"
    And a user exists with name "User Six" and email "user6@example.com" and avatar "avatar.png"
    When I request the list of users
    Then the response status should be 200
    And the first user in the list should include avatar "avatar.png"

  Scenario: Unauthenticated request is rejected
    When I create a user with:
      | name      | email              | password   |
      | User One  | user1@example.com  | password1  |
    Then the response status should be 401
