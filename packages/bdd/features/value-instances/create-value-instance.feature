Feature: Create Value Instance

  Scenario: Successfully create a new value instance
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    When I create a value instance with:
      | name            | purpose              |
      | Panel Unit #1   | First production run |
    Then the response status should be 201
    And the response should contain a value instance with name "Panel Unit #1"
    And the response should contain a value instance with value "Solar Panel"

  Scenario: Creating a value instance without valueId fails
    Given I am authenticated as "admin@marketlum.com"
    When I create a value instance without valueId with:
      | name          | purpose     |
      | Orphan Unit   | No value    |
    Then the response status should be 400

  Scenario: Creating a value instance with empty name fails
    Given I am authenticated as "admin@marketlum.com"
    And a value exists with name "Solar Panel" and type "product"
    When I create a value instance with empty name
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create a value instance unauthenticated with:
      | name          | purpose     |
      | Panel Unit #1 | Test        |
    Then the response status should be 401
