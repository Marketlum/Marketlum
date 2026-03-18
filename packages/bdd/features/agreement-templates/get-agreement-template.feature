Feature: Get Agreement Template

  Scenario: Get an existing agreement template by ID
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I request the agreement template by its ID
    Then the response status should be 200
    And the response should contain an agreement template with name "Sales Agreement"

  Scenario: Get a non-existent agreement template returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I request an agreement template with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I request an agreement template with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
