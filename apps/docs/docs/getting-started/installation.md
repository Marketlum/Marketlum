---
sidebar_position: 1
---

# Installation

## Prerequisites

- **Node.js** >= 20.9.0
- **pnpm** >= 10.6
- **PostgreSQL** >= 16 (or Docker)

## Create a New Project

The fastest way to get started is with `create-marketlum-app`:

```bash
npx create-marketlum-app my-market
cd my-market
```

This scaffolds a complete project with:
- An API application (NestJS)
- A web application (Next.js)
- Pre-configured database migrations
- Admin user seeder

## Start the Database

Using Docker:

```bash
pnpm db:up
```

Or configure PostgreSQL manually and update the `.env` file with your connection details.

## Run Migrations

```bash
pnpm migration:run
```

This creates all required database tables and indexes.

## Seed the Admin User

```bash
pnpm seed:admin
```

This creates the default admin user:
- **Email:** admin@marketlum.com
- **Password:** password123

## Start Development

```bash
pnpm dev
```

The API starts on [http://localhost:3001](http://localhost:3001) and the web app on [http://localhost:3000](http://localhost:3000).

Log in at [http://localhost:3000/login](http://localhost:3000/login) with the admin credentials above.
