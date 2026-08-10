Feature: Audit trail captures auth events

  Scenario: A successful login is logged
    Given a user exists with email "alice@marketlum.com" and password "password123"
    When I log in as "alice@marketlum.com" with password "password123"
    Then the latest audit entry has category "auth" and action "login_success"
    And the audit entry is attributed to the human "alice@marketlum.com"

  Scenario: A failed login records the attempted email and nothing password-shaped
    When I log in as "nobody@marketlum.com" with password "wrong-password"
    Then the latest audit entry has category "auth" and action "login_failure"
    And the audit entry context records attempted email "nobody@marketlum.com"
    And the audit entry context contains no password material

  Scenario: A logout is logged
    Given a user exists with email "alice@marketlum.com" and password "password123"
    And I am logged in as "alice@marketlum.com" with password "password123"
    When I log out
    Then the latest audit entry has category "auth" and action "logout"
    And the audit entry is attributed to the human "alice@marketlum.com"

  Scenario: An agent login attempt is recorded with its rejection reason
    Given an agent user exists with email "pricing-bot@marketlum.com"
    When I log in as "pricing-bot@marketlum.com" with password "password123"
    Then the latest audit entry has category "auth" and action "login_failure"
    And the audit entry context records rejection reason "agent_login_rejected"
