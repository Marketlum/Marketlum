Feature: Create Agreement

  Scenario: Successfully create a root agreement with parties
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    When I create an agreement with:
      | title              | content           |
      | Trade Agreement    | Agreement terms   |
    Then the response status should be 201
    And the response should contain an agreement with title "Trade Agreement"
    And the response should contain an agreement with content "Agreement terms"
    And the response should contain 2 parties

  Scenario: Successfully create a child agreement
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a root agreement exists with title "Master Agreement"
    When I create a child agreement with parent "Master Agreement":
      | title              |
      | Sub Agreement      |
    Then the response status should be 201
    And the response should contain an agreement with title "Sub Agreement"

  Scenario: Create agreement with file and link
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    And a file exists with name "contract.pdf"
    When I create an agreement with file and link:
      | title              | link                    |
      | Filed Agreement    | https://example.com/doc |
    Then the response status should be 201
    And the response should contain an agreement with title "Filed Agreement"
    And the response should include a file
    And the response should contain link "https://example.com/doc"

  Scenario: Creating an agreement with empty title fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    When I create an agreement with empty title
    Then the response status should be 400

  Scenario: Creating an agreement with fewer than 2 parties fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    When I create an agreement with 1 party
    Then the response status should be 400

  Scenario: Creating an agreement with non-existent parent fails
    Given I am authenticated as "admin@marketlum.com"
    And an agent exists with name "Party A"
    And an agent exists with name "Party B"
    When I create an agreement with non-existent parent
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I create an agreement without authentication
    Then the response status should be 401
