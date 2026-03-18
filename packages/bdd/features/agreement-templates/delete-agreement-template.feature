Feature: Delete Agreement Template

  Scenario: Successfully delete a leaf agreement template
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I delete the agreement template
    Then the response status should be 204

  Scenario: Deleting an agreement template with children is prevented
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
    When I delete the agreement template "Sales Agreement"
    Then the response status should be 409

  Scenario: Delete a non-existent agreement template returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the agreement template with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the agreement template with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
