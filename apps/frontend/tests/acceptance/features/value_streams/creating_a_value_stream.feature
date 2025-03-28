Feature: Creating a value stream 
    As a Market Steward
    In order to start a new team, business line or start-up
    I want to create a new value stream

    Background:
        Given I am logged in as a steward

  Scenario: Simple value stream is created succcessfully 
        When I want to create a new value stream
        And I specify its name as "React Training Services"
        And I try to add it
        Then I should be notified it has been succcessfully created
        And value stream "React Training Services" should exist