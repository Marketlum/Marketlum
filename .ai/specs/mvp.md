You are a senior full-stack engineer and software architect. You will build an MVP for a product called **Marketlum**.

## 0) Mission

Create a production-grade monorepo using:

* Backend API: **NestJS** + **TypeORM** + **Postgres**
* Frontend App: **Next.js App Router** + **TailwindCSS** + **shadcn/ui**
* Testing: **Behavior Driven Development**

* Write `.feature` files first (Gherkin)
* Then generate automated tests/specs from them
* Then implement until tests pass

* Architecture: **modular**, with clean boundaries and future extensibility.

## 1) Product Definition (MVP Scope)

Marketlum is a “framework for building markets”.

MVP must support:
    * Users management
    * Agents management

## 2) Data Model (high-level)

Use a modular domain approach:

### User

* id (uuid)
* email (unique)
* passwordHash
* createdAt / updatedAt

### Agent 

* id (uuid)
* name
* shortName (optional)
* purpose (optional)
* code (optional, unique)
* type (one of: organization, individual, virtual)
* link (optional)
* birthday (optional)
* createdAt / updatedAt

## 3) Architecture Requirements

### Backend

Use NestJS modules:

* AuthModule
* UsersModule
* AgentsModule

Patterns:

* DTO validation with class-validator
* clean controllers/services/repositories
* migrations for db schema
* config via env

### Frontend

Next.js app router pages:

* /login
* /app (authenticated shell)
* /app/users
* /app/agents

UI:

* shadcn/ui components
* Tailwind styling
* Minimal but beautiful
* Forms with react-hook-form + zod validation
* Paginated lists with search, filters and sorting

Auth:

* Use JWT (access token) stored in httpOnly cookie

## 4) BDD Workflow (STRICT)

We will work feature-first:

### Step A: Write Gherkin feature files

Create folder:

* `packages/bdd/features/*.feature`

Write features for:

* user login
* users CRUD
* agents CRUD

### Step B: Generate tests/specs

Backend:

* Use Jest + Supertest for API integration tests
* Map scenarios to tests

Frontend:

* Use Playwright for end-to-end tests (optional in MVP)

### Step C: Implement until green

Implement backend endpoints and frontend UI.
Run tests.
Iterate until all pass.

## 5) API Requirements

Backend routes:

### Auth

* POST /auth/login
* POST /auth/logout
* GET /auth/me

## 6) Repo Setup

Create a monorepo with pnpm workspaces:

* apps/api (NestJS)
* apps/web (Next.js)
* packages/shared (types, zod schemas)
* packages/bdd (feature files + test mapping)

Include:

* eslint + prettier
* env example files
* README with commands

## 7) Deliverables (DO THIS NOW)

Start by creating the `.feature` files first.
Then implement the backend with tests.
Then implement the frontend.
Commit in logical steps.

### Output expectations:

* show directory structure
* show the feature files
* show the tests created
* show the key implementation files
* provide commands to run everything locally

## 8) Quality Constraints

* Keep code clean and modular
* No huge god services
* Use dependency injection properly
* Use migrations, not synchronize=true
* Provide typed API client in frontend (simple fetch wrapper)
* Avoid premature complexity, but keep future-proof structure

Now begin.