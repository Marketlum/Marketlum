Feature: Search Agreement Templates

  Scenario: List agreement templates with pagination
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
      | Payment Terms     | annex           |
      | Delivery Schedule | schedule        |
    When I request the list of agreement templates
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search agreement templates by name
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
      | Sales Annex       | annex           |
      | Delivery Schedule | schedule        |
    When I request the list of agreement templates with search "Sales"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Search agreement templates by description
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name              | type            | description              |
      | Sales Agreement   | main_agreement  | Standard sales contract  |
      | Payment Terms     | annex           | Standard payment terms   |
      | Delivery Schedule | schedule        | Logistics timeline       |
    When I request the list of agreement templates with search "Standard"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter agreement templates by type
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name              | type            |
      | Sales Agreement   | main_agreement  |
      | Partner Agreement | main_agreement  |
      | Payment Terms     | annex           |
    When I request the list of agreement templates with type "main_agreement"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter agreement templates by value stream
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Revenue Stream"
    And an agreement template exists with name "Sales Agreement" and type "main_agreement" and value stream "Revenue Stream"
    And an agreement template exists with name "Payment Terms" and type "annex"
    When I request the list of agreement templates with valueStreamId for "Revenue Stream"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Sort agreement templates by name
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name      | type            |
      | Zebra     | main_agreement  |
      | Alpha     | annex           |
      | Mango     | schedule        |
    When I request the list of agreement templates sorted by "name" in "ASC" order
    Then the response status should be 200
    And the first agreement template should have name "Alpha"

  Scenario: Paginate results
    Given I am authenticated as "admin@marketlum.com"
    And the following agreement templates exist:
      | name        | type            |
      | Template A  | main_agreement  |
      | Template B  | annex           |
      | Template C  | schedule        |
    When I request the list of agreement templates with page 1 and limit 2
    Then the response status should be 200
    And the response should contain 2 agreement templates

  Scenario: Unauthenticated request is rejected
    When I request the list of agreement templates
    Then the response status should be 401
