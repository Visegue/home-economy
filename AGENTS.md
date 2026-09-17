<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance

- UI copy is Swedish; identifiers and commits are English.
- Use `pnpm` and CI's Node.js 24. Bun may run the app, but must not manage packages.
- Run `pnpm check` before handoff and `pnpm test:e2e` for user-visible flows.
- Default to Server Components; use `"use client"` only for interactive UI.
- Use `src/components/ui` shadcn/ui primitives and `src/app/globals.css` tokens.
- Store money as integer öre in code and `numeric(14,2)` in Postgres.
- Change `src/db/schema/`, run `pnpm db:generate`, then review SQL before migration.
- Access household data only through `withAuthenticatedDatabase()` and forced RLS.
- Never expose or commit database URLs, auth/OAuth secrets or real allowed e-mail addresses.
- Runtime uses Neon's pooled connection with prepared statements disabled. Prefer a separate owner connection in `DATABASE_MIGRATION_URL` for migrations.
- Local development uses `dev/alexander`, separate from Preview (`development`) and Production (`production`). PGlite requires `DATABASE_PROVIDER=pglite` and is only for tests/offline work. Run `pnpm db:check` after database integration or permission changes.
- Never commit the source workbook or production-like personal data. Use synthetic fixtures.

## Versioning and releases

- Before a PR with app, dependency, migration, release-script or build/deploy changes, raise `package.json`'s SemVer above `main`. Choose patch/minor/major deliberately and explain it in the PR. Docs-only, test-file-only and CI-only changes may keep the version.
- Prereleases on `main` still deploy to production. Build metadata (`+...`) alone is not a version increase. Compare with the latest `main` and raise again if another PR merges first.
- Only CI creates release tags and GitHub Releases, after successful production deploy. Never create or move tags manually. Follow `docs/release-runbook.md`. Update `scripts/check-pr-version.mjs` and its tests for new release-affecting paths.
