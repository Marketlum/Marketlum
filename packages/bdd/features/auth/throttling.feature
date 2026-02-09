Feature: API Rate Limiting

  Scenario: Login endpoint is throttled after 5 requests
    Given a user exists with email "admin@marketlum.com" and password "password123"
    When I send 6 login requests with email "admin@marketlum.com" and password "password123"
    Then the first 5 responses should have status 200
    And the 6th response should have status 429

  Scenario: General API endpoints are throttled after 100 requests
    Given I am authenticated as "admin@marketlum.com"
    When I send 101 requests to "GET /auth/me"
    Then the first 100 responses should have status 200
    And the 101st response should have status 429
