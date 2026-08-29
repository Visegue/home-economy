---
status: accepted
date: 2026-08-29
---

# Use Neon, Better Auth, and PGlite

The application will use PostgreSQL through Drizzle in every environment. Local
development runs on PGlite without a cloud dependency. Hosted environments run
in one Neon project: the root branch is production, the long-lived `development`
child branch serves as staging, and pull-request previews may create short-lived
`preview/pr-*` branches. Runtime traffic uses pooled connections; schema
migrations use direct owner connections.

Authentication is handled directly by Better Auth, initially with Google OAuth
only. Auth records live beside the finance schema in PostgreSQL. Household data
is protected with forced row-level security and a transaction-local user
context.

## Considered options

- **Supabase for database and authentication.** Its integrated product is
  convenient, but separate projects add overhead for frequent scaffolds and the
  application would couple its authentication and data access to one managed
  platform.
- **Neon Auth.** This remains a viable future managed option, but direct Better
  Auth keeps the first version portable and lets local PGlite use the same auth
  schema as hosted PostgreSQL.
- **Separate Neon projects per environment.** Rejected for the initial version.
  Neon branches provide isolated schema, data, credentials, and compute while
  avoiding a full project per preview or staging environment.
- **Docker-based PostgreSQL locally.** Rejected as the default because PGlite
  makes a new checkout and small proof of concept usable without Docker. A
  regular PostgreSQL instance can still be selected through `DATABASE_URL`.

## Consequences

- Every schema change must be exercised locally, then promoted through staging
  before production.
- Preview automation must create and remove branches so obsolete environments
  do not accumulate.
- The application owns Better Auth upgrades and OAuth configuration instead of
  delegating those changes to Neon.
- Runtime and migration connection strings are separate deployment secrets and
  must never be committed.
- PGlite is close to PostgreSQL but cannot prove every hosted behavior; RLS and
  migration checks must also run against staging before release.
