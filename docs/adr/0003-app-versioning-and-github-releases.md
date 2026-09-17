---
status: accepted
date: 2026-09-17
---

# Version the app from package.json and release after deployment

The repository currently deploys one web app, although it may later contain
native apps and shared packages. We use `package.json.version` as the app's
single SemVer 2.0.0 source of truth. A required PR check demands a higher
version than `main` for app- or release-affecting changes and comments on a
blocked PR; documentation-only, test-file-only, and CI-only changes are
exempt. After a successful production promotion, CI creates `v<version>` on
the deployed commit and publishes the corresponding GitHub Release. Tags are not created
or moved manually.

## Considered options

- **Changesets or another release manager:** useful once several packages need
  independent versions, but adds tooling and workflow overhead for one app.
  Reconsider when the repository actually becomes a multi-product monorepo.
- **Manual versioning and tags:** simpler automation, but makes it easy to
  forget a version bump or publish a tag before the deployment succeeds.

## Consequences

- Agents and contributors must choose patch, minor, or major deliberately and
  explain the choice in the PR. Concurrent PRs may need a second bump after
  `main` advances. Build metadata alone does not increase SemVer precedence.
- A prerelease merged to `main` still deploys to production; it only changes
  the GitHub Release label.
- If GitHub Release publication fails after promotion, production may already
  run the new version. Follow the [release runbook](../release-runbook.md) to
  recover without moving an existing tag.
