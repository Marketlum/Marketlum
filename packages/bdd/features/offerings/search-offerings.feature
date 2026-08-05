Feature: Search Offerings

  Scenario: Search with default pagination
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Premium Plan"
    And an offering exists with name "Basic Plan"
    And an offering exists with name "Enterprise Plan"
    When I search offerings
    Then the response status should be 200
    And the response should contain a paginated list
    And the total count should be 3

  Scenario: Search by name text
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Premium Plan"
    And an offering exists with name "Basic Plan"
    And an offering exists with name "Enterprise Deal"
    When I search offerings with search "Plan"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by state
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Draft One" and state "draft"
    And an offering exists with name "Live One" and state "live"
    And an offering exists with name "Live Two" and state "live"
    When I search offerings with state "live"
    Then the response status should be 200
    And the total count should be 2

  Scenario: Filter by actorId
    Given I am authenticated as "admin@marketlum.com"
    And an actor exists with name "Actor Alpha"
    And an actor exists with name "Actor Beta"
    And an offering exists with name "Alpha Offer" for actor "Actor Alpha"
    And an offering exists with name "Beta Offer" for actor "Actor Beta"
    And an offering exists with name "No Actor Offer"
    When I search offerings with actorId for "Actor Alpha"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Filter by valueStreamId
    Given I am authenticated as "admin@marketlum.com"
    And a value stream exists with name "Stream A"
    And a value stream exists with name "Stream B"
    And an offering exists with name "Stream A Offer" for value stream "Stream A"
    And an offering exists with name "Stream B Offer" for value stream "Stream B"
    When I search offerings with valueStreamId for "Stream A"
    Then the response status should be 200
    And the total count should be 1

  Scenario: Sort by name ascending
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "Charlie"
    And an offering exists with name "Alpha"
    And an offering exists with name "Bravo"
    When I search offerings sorted by "name" "ASC"
    Then the response status should be 200
    And the first offering should have name "Alpha"

  Scenario: Default sort by createdAt descending
    Given I am authenticated as "admin@marketlum.com"
    And an offering exists with name "First"
    And an offering exists with name "Second"
    And an offering exists with name "Third"
    When I search offerings
    Then the response status should be 200
    And the first offering should have name "Third"

  Scenario: Unauthenticated request is rejected
    When I search offerings
    Then the response status should be 401
