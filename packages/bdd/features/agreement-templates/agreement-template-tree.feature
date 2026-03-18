Feature: Agreement Template Tree

  Scenario: Get the full agreement template tree
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
      | Delivery Schedule | schedule        | Sales Agreement   |
      | Partner Agreement | main_agreement  |                   |
    When I request the full agreement template tree
    Then the response status should be 200
    And the tree should contain 2 root nodes
    And the root "Sales Agreement" should have 2 children

  Scenario: Get root agreement templates only
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
      | Partner Agreement | main_agreement  |                   |
    When I request the root agreement templates
    Then the response status should be 200
    And the response should contain 2 agreement templates

  Scenario: Get direct children of an agreement template
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement template tree exists:
      | name              | type            | parent            |
      | Sales Agreement   | main_agreement  |                   |
      | Payment Terms     | annex           | Sales Agreement   |
      | Delivery Schedule | schedule        | Sales Agreement   |
      | SLA Exhibit       | exhibit         | Payment Terms     |
    When I request the children of "Sales Agreement"
    Then the response status should be 200
    And the response should contain 2 agreement templates

  Scenario: Unauthenticated request is rejected
    When I request the full agreement template tree
    Then the response status should be 401
