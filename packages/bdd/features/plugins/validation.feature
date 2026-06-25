Feature: Plugin validation at registration

  validatePlugins() runs while MarketlumCoreModule.forRoot() builds the dynamic
  module, so a misconfigured plugin fails fast at boot rather than corrupting the
  schema or the namespace. Each scenario configures the core module with a
  deliberately broken plugin and asserts configuration is rejected with a helpful
  error.

  Scenario: Two plugins declaring the same id are rejected
    Given two plugins that both declare the id "dup"
    When the core module is configured with those plugins
    Then configuration fails with an error mentioning a duplicate plugin id "dup"

  Scenario: A plugin id that collides with a reserved core name is rejected
    Given a plugin declaring the reserved id "agents"
    When the core module is configured with that plugin
    Then configuration fails with an error mentioning a reserved plugin id "agents"

  Scenario: An entity whose table is not namespaced is rejected
    Given a plugin "badns" with an entity mapped to the table "widgets"
    When the core module is configured with that plugin
    Then configuration fails with an error mentioning the required table prefix "plugin_badns_"

  Scenario: A plugin requiring an incompatible core version is rejected
    Given a plugin requiring core version "^99.0.0"
    When the core module is configured with that plugin
    Then configuration fails with an error mentioning an incompatible core version
