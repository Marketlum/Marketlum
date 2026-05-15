Feature: Get Value by code

  Scenario: Looking up an existing value by code returns it
    Given I am authenticated as "admin@marketlum.com"
    And a value with code "lookup_me" exists
    When I GET /values/by-code/lookup_me
    Then the response status should be 200
    And the response should contain a value with code "lookup_me"

  Scenario: Looking up an unknown code returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I GET /values/by-code/no_such_thing
    Then the response status should be 404

  Scenario: Looking up with a malformed code returns 400
    Given I am authenticated as "admin@marketlum.com"
    When I GET /values/by-code/NotValid
    Then the response status should be 400
