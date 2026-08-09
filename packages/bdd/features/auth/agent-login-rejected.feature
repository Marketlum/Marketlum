Feature: Agent users cannot hold sessions

  Scenario: Password login as an agent user is rejected
    Given an agent user exists with email "pricing-bot@marketlum.com"
    When I attempt to log in as "pricing-bot@marketlum.com" with password "password123"
    Then the response status should be 401

  Scenario: A JWT cookie for an agent user is rejected
    Given an agent user exists with email "pricing-bot@marketlum.com"
    When I request my profile with a JWT cookie minted for that agent user
    Then the response status should be 401
