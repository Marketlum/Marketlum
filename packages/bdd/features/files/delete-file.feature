Feature: Delete File

  Scenario: Delete a file and clean up from disk
    Given I am authenticated as "admin@marketlum.com"
    And a file "test.png" has been uploaded
    When I delete the file
    Then the response status should be 204
    And the uploaded file should be removed from disk

  Scenario: Delete a non-existent file returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I delete the file with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I delete the file with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
