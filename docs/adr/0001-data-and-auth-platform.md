---
status: accepted
date: 2026-08-29
---

# Use Neon, Better Auth, and PGlite

The application will use PostgreSQL through Drizzle in every environment. Local
development uses an isolated Neon branch, `dev/alexander`, to exercise the same
driver, runtime role, pooling, and TLS as hosted environments. PGlite remains an
explicit offline and automated-test option. All Neon environments run
in one Neon project: the root branch is production, the long-lived `development`
child branch serves as staging, and pull-request previews may create short-lived
`preview/pr-*` branches. Runtime traffic uses pooled connections; schema
migrations use direct owner connections.

The hosted project uses AWS Frankfurt (`aws-eu-central-1`) because Neon does not
currently offer a Swedish region. Runtime connections use a dedicated
`home_economy_runtime` role without administrative attributes or RLS bypass;
the Neon owner role is reserved for migrations.

Authentication is handled directly by Better Auth with verified email/password
and Google OAuth. Matching verified email addresses link both methods to one
user. Auth records live beside the finance schema in PostgreSQL. Household data
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
- **PGlite as the default local database.** Revised on 2026-09-11: fast setup
  does not validate Neon connectivity, pooling, or runtime-role permissions.
  Neon is now the local default; PGlite is limited to explicit offline use and
  fast tests. Local work requires network access and uses Neon compute.

## Consequences

- Every schema change must be exercised locally, then promoted through staging
  before production.
- Preview automation must create and remove branches so obsolete environments
  do not accumulate.
- The application owns Better Auth upgrades and OAuth configuration instead of
  delegating those changes to Neon.
- Runtime and migration connection strings are separate deployment secrets and
  must never be committed.
- The Free plan does not support protected branches, so production protection
  relies on restricted runtime credentials and the release process until the
  project moves to a paid plan.
- Missing runtime credentials fail explicitly, including locally. Hosted
  environments must never fall back to PGlite. Migration commands load the same
  environment files as Next.js and require separate direct owner credentials.
- Local auth accounts remain in the developer branch. Do not seed development
  branches with production personal data. Google credentials and auth secrets
  remain environment-specific.
- PGlite tests cannot prove every hosted behavior; `pnpm db:check` exercises
  auth storage and RLS with the actual Neon runtime connection. Google OAuth
  and the preview proxy still require browser validation in their environments.
