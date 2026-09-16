---
status: accepted
date: 2026-09-16
---

# Keep releases database-aware with shared staging

The application stores personal financial data and has already had a production
failure caused by a missed database migration. GitHub Actions is the only release
orchestrator: it validates migrations against staging before a trusted PR can
merge, and against production before a staged Vercel deployment is promoted.
We use one long-lived Neon `development` branch for previews to stay within the
open-source project's zero-spend budget.

On trusted PRs, quality and browser tests run first. The preview job then
applies migrations with a direct owner connection, verifies the database with
the restricted runtime connection, deploys the tested commit and checks that
the login page responds. On `main`, a production deployment is staged without
moving the domain; migrations, database verification and the same smoke test
must pass before promotion. The production environment accepts only `main`.
Fork and Dependabot PRs cannot use staging secrets, so a required gate rejects
their database, auth, dependency and release changes until reviewed and rerun
from a trusted branch.

## Considered options

- **Vercel Git auto-deploy or migrations at app startup:** rejected because the
  new app might receive traffic before its schema is ready, or multiple app
  instances might race to migrate with elevated credentials.
- **A Neon branch per PR:** better isolation, but more branches and active
  computes consume the Free plan's shared allowances. Reconsider only if
  incompatible parallel schema work becomes frequent and its resource use is
  acceptable.
- **Manual migrations after merge:** rejected because the release can be
  forgotten or deployed out of order, as happened previously.

## Consequences

- Every migration must be backward-compatible with the previous app version.
  Destructive changes need an expand/contract sequence.
- Previews share schema and data in `development`; conflicting migrations must
  be sequenced, and closing a PR does not undo a migration.
- A failed post-migration check leaves the old production deployment in place
  but does not automatically roll back the database. Recovery follows the
  [release runbook](../release-runbook.md).
- CI and hosted checks consume free-tier quotas. The smoke test does not cover
  Google OAuth or email delivery; those require targeted manual verification.

This decision supersedes ADR 0001's expectation that preview automation creates
and removes a Neon branch for each PR. Its other platform decisions remain in
effect.
