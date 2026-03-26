Feature: Create Marketlum App CLI
  As a developer
  I want to scaffold a new Marketlum project
  So that I can quickly start building a market application

  Scenario: Create project with CLI argument
    Given I have a clean temporary directory
    When I run create-marketlum-app with project name "test-market"
    Then a directory "test-market" should be created
    And it should contain a valid project structure

  Scenario: Abort on non-empty directory
    Given I have a clean temporary directory
    And a directory "existing-project" already exists with files
    When I run create-marketlum-app with project name "existing-project"
    Then the CLI should exit with an error
    And the error message should mention the directory is not empty

  Scenario: Verify generated file structure
    Given I have scaffolded a project named "my-market"
    Then the following files should exist:
      | file                          |
      | package.json                  |
      | pnpm-workspace.yaml           |
      | tsconfig.base.json            |
      | .gitignore                    |
      | .npmrc                        |
      | .prettierrc                   |
      | .env.example                  |
      | docker-compose.yml            |
      | api/package.json              |
      | api/tsconfig.json             |
      | api/nest-cli.json             |
      | api/src/main.ts               |
      | api/src/app.module.ts         |
      | api/src/data-source.ts        |
      | api/src/seeds/admin.seed.ts   |
      | web/package.json              |
      | web/tsconfig.json             |
      | web/next.config.mjs           |
      | web/tailwind.config.ts        |
      | web/postcss.config.js         |
      | web/next-env.d.ts             |
      | web/src/middleware.ts          |
      | web/src/app/layout.tsx        |
      | web/src/app/page.tsx          |
      | web/src/app/globals.css       |
      | web/src/app/login/page.tsx    |
      | web/src/app/admin/layout.tsx  |
      | web/src/app/admin/page.tsx    |
      | web/src/i18n/request.ts       |
      | web/src/i18n/actions.ts       |
      | web/messages/en.json          |
      | web/messages/pl.json          |
      | web/public/logo.png           |
      | uploads/.gitkeep              |

  Scenario: Verify template replacements in root package.json
    Given I have scaffolded a project named "my-market"
    Then the root package.json should have name "my-market"

  Scenario: Verify template replacements in API package.json
    Given I have scaffolded a project named "my-market"
    Then the API package.json should have "@marketlum/core" as a dependency with version "latest"
    And the API package.json should have "@marketlum/shared" as a dependency with version "latest"
    And the API package.json should not contain test devDependencies

  Scenario: Verify template replacements in web package.json
    Given I have scaffolded a project named "my-market"
    Then the web package.json should have "@marketlum/shared" as a dependency with version "latest"
    And the web package.json should have "@marketlum/ui" as a dependency with version "latest"
    And the web package.json should not contain eslint devDependencies

  Scenario: Verify .env.example has correct database name
    Given I have scaffolded a project named "my-market"
    Then the .env.example should contain "DATABASE_NAME=my_market"

  Scenario: Verify API path adjustments
    Given I have scaffolded a project named "my-market"
    Then the api/src/app.module.ts should reference envFilePath as "../.env"
    And the api/src/data-source.ts should reference dotenv path as "../.env"
    And the api/src/seeds/admin.seed.ts should reference dotenv path as "../../.env"
    And the api/tsconfig.json should extend "../tsconfig.base.json"
