Feature: Get Current User

  Scenario: Authenticated user retrieves their profile
    Given I am authenticated as "admin@marketlum.com"
    When I request my profile
    Then the response status should be 200
    And the response should contain a user with email "admin@marketlum.com"

  Scenario: Unauthenticated request is rejected
    When I request my profile without authentication
    Then the response status should be 401
