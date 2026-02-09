Feature: Download File

  Scenario: Successfully download a file
    Given I am authenticated as "admin@marketlum.com"
    And a file "test.png" has been uploaded
    When I download the file
    Then the response status should be 200
    And the response should have content-disposition header
    And the response body should contain the file content

  Scenario: Download a non-existent file returns 404
    Given I am authenticated as "admin@marketlum.com"
    When I download a file with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404

  Scenario: Unauthenticated request is rejected
    When I download a file with ID "00000000-0000-0000-0000-000000000000"
    Then the response status should be 401
