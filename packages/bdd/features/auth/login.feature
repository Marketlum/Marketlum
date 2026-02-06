Feature: User Login

  Scenario: Successful login with valid credentials
    Given a user exists with email "admin@marketlum.com" and password "password123"
    When I login with email "admin@marketlum.com" and password "password123"
    Then the response status should be 200
    And the response should contain a user with email "admin@marketlum.com"
    And the response should set an httpOnly cookie "token"

  Scenario: Login fails with invalid password
    Given a user exists with email "admin@marketlum.com" and password "password123"
    When I login with email "admin@marketlum.com" and password "wrongpassword"
    Then the response status should be 401

  Scenario: Login fails with non-existent email
    When I login with email "nonexistent@marketlum.com" and password "password123"
    Then the response status should be 401
