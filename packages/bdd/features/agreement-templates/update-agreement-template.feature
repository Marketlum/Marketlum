Feature: Update Agreement Template

  Scenario: Successfully update an agreement template's name
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I update the agreement template's name to "Updated Sales Agreement"
    Then the response status should be 200
    And the response should contain an agreement template with name "Updated Sales Agreement"

  Scenario: Successfully update optional fields
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I update the agreement template with:
      | purpose               | description           | link                         |
      | Strategic partnerships | Full partnership desc  | https://example.com/updated  |
    Then the response status should be 200
    And the response should contain an agreement template with purpose "Strategic partnerships"
    And the response should contain an agreement template with description "Full partnership desc"
    And the response should contain an agreement template with link "https://example.com/updated"

  Scenario: Updating to a duplicate name fails
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    And a root agreement template exists with name "Partner Agreement" and type "main_agreement"
    When I update the agreement template "Partner Agreement" with name "Sales Agreement"
    Then the response status should be 409

  Scenario: Update a non-existent agreement template returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I update the agreement template with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I update the agreement template with ID "00000000-0000-0000-0000-000000000000" with name "Test"
    Then the response status should be 401
