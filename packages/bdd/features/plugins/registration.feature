Feature: Plugin registration

  The downstream app activates plugins by passing them to
  MarketlumCoreModule.forRoot({ plugins }). A registered plugin contributes its
  Nest module, its TypeORM entities/migrations, and is discoverable through the
  /plugins endpoint. The test app boots with an "example" plugin registered: a
  minimal MarketlumApiPlugin that owns a "plugin_example_widgets" table, mounts a
  controller, and declares a settings schema.

  Scenario: Registered plugins are listed via the API
    Given I am authenticated as "admin@marketlum.com"
    When I request the list of registered plugins
    Then the response status should be 200
    And the plugins list should include the plugin with id "example"
    And the "example" plugin entry should expose its name and version

  Scenario: A registered plugin's controller is mounted under its namespace
    Given I am authenticated as "admin@marketlum.com"
    When I call the example plugin's own endpoint
    Then the response status should be 200

  Scenario: A registered plugin's entities are aggregated into the data source
    Given I am authenticated as "admin@marketlum.com"
    When I create a widget through the example plugin with name "First widget"
    Then the response status should be 201
    And the widget is persisted in the "plugin_example_widgets" table

  Scenario: Listing plugins requires authentication
    When I request the list of registered plugins without authentication
    Then the response status should be 401
