Feature: Delete Locale

  Scenario: Successfully delete a locale
    Given I am authenticated as "admin@marketlum.com"
    And a locale exists with code "en-US"
    When I delete the locale
    Then the response status should be 204

  Scenario: Delete a non-existent locale returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the locale with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated user cannot delete a locale
    When I delete a locale without authentication
    Then the response status should be 401
