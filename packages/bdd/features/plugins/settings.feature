Feature: Plugin settings

  A plugin declares a settings contract (a Zod schema plus defaults). Settings are
  persisted as a single JSON blob under the namespaced key "plugin.<id>.config" in
  system_settings, read back through the defaults, and validated against the schema
  on write. The "example" plugin declares a settings schema with a "label" string
  and an "enabled" boolean (default false).

  Scenario: Reading settings before any are stored returns the plugin defaults
    Given I am authenticated as "admin@marketlum.com"
    When I get the settings for the plugin "example"
    Then the response status should be 200
    And the returned settings should equal the example plugin's defaults

  Scenario: Updating settings validates and persists them
    Given I am authenticated as "admin@marketlum.com"
    When I update the settings for the plugin "example" with a valid payload
    Then the response status should be 200
    And getting the settings for the plugin "example" returns the updated values
    And the settings are stored under the key "plugin.example.config"

  Scenario: An invalid settings payload is rejected
    Given I am authenticated as "admin@marketlum.com"
    When I update the settings for the plugin "example" with an invalid payload
    Then the response status should be 400

  Scenario: Settings for an unknown plugin return 404
    Given I am authenticated as "admin@marketlum.com"
    When I get the settings for the plugin "does-not-exist"
    Then the response status should be 404

  Scenario: Unauthenticated users cannot read or change plugin settings
    When I get the settings for the plugin "example" without authentication
    Then the response status should be 401
