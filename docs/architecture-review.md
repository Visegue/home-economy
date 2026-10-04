# Architecture review

Original review: 2026-09-28. Implementation work completed: 2026-10-04.

This document is the historical record of the completed architecture review and its four implemented improvement candidates. Candidates 1–3 were merged separately; the closing Settings change implements candidate 4 and concludes the implementation work. Completion here refers to implementation and local verification, not an assertion that the closing change has already merged or deployed.

The report is retained for rationale and verification history and does not require ongoing maintenance. See [the architecture documentation](architecture.md) for the current architecture and [the release runbook](release-runbook.md) for merge, deployment and release checks.

The original review recommended starting with the monthly household view because it combined cross-domain correctness rules in its callers. The domain discussion subsequently established **Monthly Overview** as the correct name: a monthly projection of longer-lived definitions, not a separate monthly plan. See [the domain glossary](../CONTEXT.md) for canonical English terms and Swedish display names, and [the architecture documentation](architecture.md) for current behavior.

## Final status

| Candidate                  | Original assessment          | Final implementation status                                                                                                 |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1. Monthly Overview        | Strong; first recommendation | Completed and merged in [PR 55](https://github.com/Visegue/home-economy/pull/55)                                            |
| 2. Effective period writes | Worth exploring              | Merged in [PR 58](https://github.com/Visegue/home-economy/pull/58); production deployment and release jobs passed           |
| 3. Household member module | Strong                       | Merged in [PR 61](https://github.com/Visegue/home-economy/pull/61); production database, deployment and release jobs passed |
| 4. Settings data assembly  | Speculative                  | Completed in the closing Settings change; final review, quality and browser checks passed                                   |

## Candidate 1 Monthly Overview

Original title: “Deepen the monthly household plan.”

### Original finding and proposal

The monthly view coordinated budget and savings reads, repeated period filtering, aggregation order, missing-income semantics, and transfer arithmetic. These rules were spread across the dashboard and savings UI rather than owned by one module.

The proposal was a small interface accepting a period and returning a display-ready model. Its implementation would own budget and savings reads, period selection, totals, transfers, and the distinction between missing and zero income. Expected benefits were keeping related rules together, consistent totals across callers, and testing the combined result through the same interface used by the UI.

Original inspection points:

- `src/features/dashboard/overview-dashboard.tsx`
- `src/features/budget/data.ts` and `src/features/budget/model.ts`
- `src/features/savings/data.ts`, `src/features/savings/validation.ts`, and `src/features/savings/savings-section.tsx`

Deletion test: removing the proposed module would spread read coordination, period filtering, and cross-domain rules back into monthly callers.

### Completed implementation

[PR 55](https://github.com/Visegue/home-economy/pull/55) was merged on 2026-09-30. The implementation is [getMonthlyOverview(period)](../src/features/dashboard/monthly-overview.ts), verified through [monthly overview integration tests](../src/features/dashboard/monthly-overview.test.ts).

- One authenticated, read-only `REPEATABLE READ` transaction supplies a consistent snapshot while retaining household isolation and forced RLS.
- The read model selects active income, expenses, replacement reserves (Avräkningar), and savings for the requested month.
- Per-item monthly amounts, table totals, transfers, and the monthly remainder use integer öre. Missing income remains distinct from a recorded zero.
- The UI consumes the monthly results while preserving separate expense, replacement-reserve, and savings presentations.

This work does not implement actual payments, confirmed funding, account balances, investment returns, or net worth. The monthly amounts remain expected contributions rather than recorded money movements. Write-side period handling and settings data assembly remain separate concerns.

## Candidate 2 Effective period writes

### Original finding and proposal

`validity.ts` supplies period decisions, but expense, income, and savings callers still own the protocol for locking a row, rejecting stale changes, replacing or splitting its validity period, and preserving related information. Expense writes also manage owner links; savings writes preserve fields not changed by the form.

The proposal is to put the shared transactional protocol behind one module interface, while keeping domain-specific values and preservation requirements explicit. This should concentrate the ordering and history rules instead of merely extracting date calculations.

Original inspection points:

- `src/features/budget/validity.ts`
- `src/features/budget/data.ts`
- `src/features/savings/data.ts`
- `src/db/household-rls.test.ts`

Expected benefits are a single place to maintain shared rules and tests that exercise the complete protocol. Deletion test: removing the proposed module should recreate the protocol in the three callers; removing the existing helper mostly relocates date logic.

### Follow up

Implemented after PR 55 through `features/periods/write.ts`: one protocol owns row/identity locks, revision checks, exact-date splitting, correction and ending. Expense, income and savings adapters retain their domain-specific fields. `features/periods/model.ts` owns monthly version selection; `features/funding` separates plans from manually confirmed movements. Migration 0014 is additive and preserves legacy month-based history without guessing identity links. No performance or cost improvement has been measured.

### Agreed direction for changes within a month

Agreed on 2026-09-30 and implemented locally. Items change on specific calendar dates, preserving preceding and future versions. This is effective-date history, not a complete audit log. Confirmed transfers are stored separately. The final decisions are recorded in [ADR 0004](adr/0004-effective-dates-and-confirmed-transfers.md).

The Monthly Overview should display the item's state at the end of the selected month, using the changes known at the time of viewing. Show a notice when the item changes during that month, including the change date and the previous and new values. Item details can distinguish what applies today from future changes and history.

Confirmed example: a Savings Contribution increases from SEK 1,000 to SEK 1,500 on 20 October, with the month's transfer scheduled for 25 October. October contains one expected contribution of SEK 1,500, not both amounts and not a daily prorated amount. The overview displays SEK 1,500 with a notice such as “Ändras 20 okt: 1 000 → 1 500 kr”. This does not confirm that the transfer occurred.

The month-end display value is separate from the monthly contribution at the scheduled date. All types use the same effective-date rules, without daily proration. Each item has its own scheduled day, initially taken from household defaults by type. Confirmed transfers can occur multiple times in a month with arbitrary amounts; actual date affects value, attribution month affects plan progress.

Validation, persistence, monthly selection, calculations and forms now support exact dates. History and transfer pages expose these rules. Database tests cover future-version preservation, stale revisions, legacy history, RLS, idempotent transfers and independent attribution. Before deployment, apply migration 0014 and run `pnpm db:check` against the intended Neon environment; no external migration was performed during local implementation.

## Candidate 3 Household member module

### Original finding and proposal

Member terminology, validation, appearance, lifecycle, and expense-owner projections are distributed across Household, Budget, and Settings. The original review found appearance helpers in Households, member types and validation in the budget model, lifecycle writes in budget data, and defaults and lifecycle UI in Settings. Settings also loads expenses it does not need through the broad budget read.

The proposal is a household member module owning member validation, defaults, uniqueness, lifecycle, and projections for consumers. Budget would consume member results rather than own member lifecycle rules.

Original inspection points:

- `src/features/budget/data.ts`, `src/features/budget/actions.ts`, `src/features/budget/forms.tsx`, and `src/features/budget/model.ts`
- `src/features/households/member-appearance.ts`
- `src/app/(app)/settings/page.tsx`

Expected benefits are keeping member rules together, a shared interface for Settings and expense owners, and narrower reads that avoid unused expense data. Deletion test: removing the existing appearance module only moves small functions; removing the proposed module would scatter validation, defaults, ownership, and lifecycle again.

### Follow up

Implemented on 2026-10-01 in `src/features/households/members/` and merged in [PR 61](https://github.com/Visegue/home-economy/pull/61) on 2026-10-02. The module owns member input validation, appearance, palette defaults, household-scoped name uniqueness, authenticated lifecycle writes, and expense-owner validation and projections. Member writes serialize on the household row so duplicate checks and default-color selection agree across concurrent writes. Existing account-access membership is unchanged: these members remain names for expense ownership, not login accounts.

Settings consumes `getHouseholdMembers()` and the narrow `getIncomeData()` read instead of loading all expenses and owner links. Budget uses member transaction readers within the Monthly Overview's existing authenticated snapshot. Renaming updates owner displays; removing a member cascades owner links, including historical versions, while preserving financial definitions. The existing lifecycle/RLS and browser tests exercise the new interface; direct-write coverage also checks validation, name/color normalization and saved-member defaults. No schema migration is required.

Pre-submission validation on Node.js 24: `pnpm check` passed, including 252 tests and the production build. The full `pnpm test:e2e` rerun passed all 17 browser tests. An initial transfer-dialog timeout did not recur in either the isolated transfer tests or the full rerun; the parallel test server also logged PGlite abort messages. Local `pnpm db:check` could not run because this worktree has no `DATABASE_URL`; verification against `dev/alexander` remains pending. The [CI run for merge commit 0b1f95d](https://github.com/Visegue/home-economy/actions/runs/37003903183) subsequently passed quality, end-to-end tests, production migrations, live production `pnpm db:check`, deployment and release publication on 2026-10-02.

The user confirmed the existing member semantics on 2026-10-01: names represent expense owners independently of login access, renames affect historical owner displays, and removal clears historical owner links while preserving expenses. A subsequent review against both the project standards and candidate 3's requirements found no implementation, authentication/RLS or scope issues. Live production verification is complete; local development verification remains separate.

The dependency audit reported zero known vulnerabilities across production and development dependencies. GitHub CodeQL default setup is enabled and there were no open code-scanning alerts at review time. This records repository state before submission; CodeQL also passed for the merge commit. [Version `0.9.1`](https://github.com/Visegue/home-economy/releases/tag/v0.9.1) was released on 2026-10-02, a patch for the behavior-preserving refactor and member-write validation/concurrency hardening.

PR 61 addressed the known unused-data problem through narrower reads. Candidate 4 subsequently added the settings assembly interface described below.

## Candidate 4 Settings data assembly

### Original finding and proposal

The Settings route coordinates budget data, account data, query state, and deployment-version information. Its broad budget read also fetches unused expenses and owner links.

The proposal is a settings-ready read module returning only the household, income, account, and deployment information the page needs. The original report made this conditional: coordinated verification or a second caller should justify the interface before extraction.

Original inspection points:

- `src/app/(app)/settings/page.tsx`
- `src/features/budget/data.ts`
- `src/features/account/data.ts`
- `src/lib/deployment-version.ts`

Potential benefits are narrower reads and a focused test surface for coordinated data assembly. The risk is creating a thin wrapper that only moves code. Deletion test: the module earns its place only if removing it redistributes meaningful coordination, not just a list of calls.

### Follow up

Implemented on 2026-10-04 in the closing Settings change through [getSettingsData(searchParams)](../src/features/settings/data.ts). The server-only module assembles household, income, members and defaults, account settings, the current period, account-link feedback and deployment-version information into the result consumed by the Settings page. It retains the existing parallel, narrow authenticated reads without fetching expenses or owner links. Query feedback accepts only `success` or `error`, including the existing behavior of ignoring other or repeated values.

The page owns presentation and consumes one read interface. Household member, income and account rules remain in their existing modules. No schema migration, write protocol or permission change is required. The planned release is `0.9.2`, a patch for this behavior-preserving refactor above the confirmed latest `main` version `0.9.1`.

Validation on Node.js 24: `pnpm check` passed, including all 252 tests and the production build. `pnpm test:e2e --workers=2` passed all 17 browser tests, including Settings income and member management, account-link cancellation feedback and deployment-version display. The test server emitted the previously observed PGlite abort messages; no browser test failed.

A final review of the working-tree change against both project standards and the authorized candidate 4 scope found no actionable findings. Focused security inspection confirmed that the server-only assembly retains the existing session checks and authenticated household readers, adds no shared cache, and returns no secrets or raw environment object. Account-link query feedback does not establish that an account is linked; the existing account component also checks the actual provider state. Existing integration and browser coverage is sufficient for this orchestration refactor; no new database or permission behavior requires an additional live database check. The README now reflects exact-date changes and manually confirmed transfers and links to ADR 0004.

## Completion

All four implementation candidates are addressed and the architecture review's implementation work is complete. The closing change contains the Settings module and final documentation updates; no additional architecture implementation remains from this report. Merge, CI and deployment verification follow the release runbook. The previously recorded local `dev/alexander` database verification and dependency security monitoring are separate operational concerns, not unfinished architecture candidates.

### Candidate 2 pre-review follow-up (historical)

The local follow-up protects pending transfer confirmations from dialog close/reopen, excludes inactive definitions from expected withdrawals and uses the shared Select primitives. Regression coverage includes slow confirmations, inactive allocated expenses, and both allocated/replacement reserves retaining confirmed values through a conversion to direct expense. The planned release is 0.9.0 (new functionality). ADR 0004 and the release runbook define the first-write compatibility boundary: older month-only applications must not resume editing after exact-date writes. Migration/RLS verification against Neon remains required before merge; no external deployment or access restriction has been performed locally.
