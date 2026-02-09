Feature: CSRF Protection
  The API requires a custom X-CSRF-Protection header on all mutating requests
  to guard against cross-site request forgery attacks.

  Scenario: POST with CSRF header succeeds
    Given a user exists with email "admin@marketlum.com" and password "password123"
    When I login with email "admin@marketlum.com" and password "password123" including the CSRF header
    Then the response status should be 200

  Scenario: POST without CSRF header is rejected
    Given a user exists with email "admin@marketlum.com" and password "password123"
    When I login with email "admin@marketlum.com" and password "password123" without the CSRF header
    Then the response status should be 403

  Scenario: GET without CSRF header succeeds
    When I send a GET request to "/auth/me" without the CSRF header
    Then the response status should be 401

  Scenario: DELETE without CSRF header is rejected
    When I send a DELETE request to "/users/00000000-0000-0000-0000-000000000000" without the CSRF header
    Then the response status should be 403

  Scenario: PATCH without CSRF header is rejected
    When I send a PATCH request to "/users/00000000-0000-0000-0000-000000000000" without the CSRF header
    Then the response status should be 403
