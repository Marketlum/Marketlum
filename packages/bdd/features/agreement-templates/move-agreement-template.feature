Feature: Move Agreement Template

  Scenario: Move an agreement template to a different parent
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Partner Agreement | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
    When I move "Payment Terms" to parent "Partner Agreement"
    Then the response status should be 200
    And the children of "Partner Agreement" should include "Payment Terms"

  Scenario: Move an agreement template to root
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
    When I move "Payment Terms" to root
    Then the response status should be 200
    And the root agreement templates should include "Payment Terms"

  Scenario: Move to a non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And a root agreement template exists with name "Sales Agreement" and type "main_agreement"
    When I move "Sales Agreement" to non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I move agreement template with ID "00000000-0000-0000-0000-000000000000" to root
    Then the response status should be 401
