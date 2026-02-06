Feature: User Logout

  Scenario: Successful logout clears the auth cookie
    Given I am authenticated as "admin@marketlum.com"
    When I request to logout
    Then the response status should be 204
    And the "token" cookie should be cleared
