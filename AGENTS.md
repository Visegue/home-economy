<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance

- Product language and UI copy are Swedish. Code identifiers and commits are English.
- Use `pnpm`; Node.js 24 is the supported CI runtime. Bun may run the app, but is not the package manager.
- Run `pnpm check` before handing off a change. Use `pnpm test:e2e` for user-visible flows.
- Keep Server Components as the default. Add `"use client"` only around genuinely interactive UI.
- Use shadcn/ui primitives from `src/components/ui` and the design tokens in `src/app/globals.css`.
- Store money as integer öre in application logic and `numeric(14,2)` in Postgres.
- Database changes start in `src/db/schema/`, then use `pnpm db:generate`; review the generated SQL before migration.
- All household data is protected by forced RLS. Access it only inside `withAuthenticatedDatabase()`.
- Never expose or commit database URLs, Better Auth secrets, OAuth secrets, or real allowed e-mail addresses.
- Use Neon's pooled connection string at runtime with prepared statements disabled. Prefer a separate owner connection in `DATABASE_MIGRATION_URL` for migrations.
- Local app development uses its own Neon branch (`dev/alexander`), separate from Preview (`development`) and Production (`production`). PGlite requires explicit `DATABASE_PROVIDER=pglite` and is only for tests/offline development. Run `pnpm db:check` for changes affecting database integration or permissions.
- Do not commit the source workbook or production-like personal data. Demo fixtures must be synthetic.
