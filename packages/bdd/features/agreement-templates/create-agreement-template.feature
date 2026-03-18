Feature: Create Agreement Template

  Scenario: Successfully create a root agreement template
    Given I am authenticated as "admin@marketlum.com"
    When I create an agreement template with:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
    Then the response status should be 201
    And the response should contain an agreement template with name "Sales Agreement"
    And the response should contain an agreement template with type "main_agreement"

  Scenario: Successfully create a child agreement template
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I create an agreement template with parent "Sales Agreement":
      | name            | type   |
      | Payment Terms   | annex  |
    Then the response status should be 201
    And the response should contain an agreement template with name "Payment Terms"
    And the response should contain an agreement template with type "annex"

  Scenario: Successfully create an agreement template with all fields
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Revenue Stream"
    When I create an agreement template with:
      | name                | type            | purpose               | description           | link                         |
      | Partnership Deal    | main_agreement  | Strategic partnerships | Full partnership desc  | https://example.com/partner  |
    And the agreement template references value stream "Revenue Stream"
    Then the response status should be 201
    And the response should contain an agreement template with name "Partnership Deal"
    And the response should contain an agreement template with purpose "Strategic partnerships"
    And the response should contain an agreement template with description "Full partnership desc"
    And the response should contain an agreement template with link "https://example.com/partner"

  Scenario: Creating an agreement template with duplicate name fails
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I create an agreement template with:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
    Then the response status should be 409

  Scenario: Creating an agreement template with missing name fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an agreement template with:
      | name | type            |
      |      | main_agreement  |
    Then the response status should be 400

  Scenario: Creating an agreement template with invalid type fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an agreement template with:
      | name            | type          |
      | Bad Template    | invalid_type  |
    Then the response status should be 400

  Scenario: Creating an agreement template with invalid link fails
    Given I am authenticated as "admin@marketlum.com"
    When I create an agreement template with:
      | name            | type            | link      |
      | Bad Template    | main_agreement  | not-a-url |
    Then the response status should be 400

  Scenario: Unauthenticated request is rejected
    When I create an agreement template with:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
    Then the response status should be 401
