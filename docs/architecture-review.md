# Architecture review

Original review: 2026-09-28. Status updated: 2026-09-30.

This document preserves the four improvement candidates from the original HTML architecture review, with implementation status recorded separately. Candidate 1 is merged. Candidate 2 is implemented in the current working branch, including the agreed effective-date and manual-funding behavior; it is not yet merged or deployed. Candidates 3–4 remain optional future work.

The original review recommended starting with the monthly household view because it combined cross-domain correctness rules in its callers. The domain discussion subsequently established **Monthly Overview** as the correct name: a monthly projection of longer-lived definitions, not a separate monthly plan. See [the domain glossary](../CONTEXT.md) for canonical English terms and Swedish display names, and [the architecture documentation](architecture.md) for current behavior.

## Status

| Candidate                  | Original assessment          | Status as of 2026-09-30                                                          |
| -------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| 1. Monthly Overview        | Strong; first recommendation | Completed and merged in [PR 55](https://github.com/Visegue/home-economy/pull/55) |
| 2. Effective period writes | Worth exploring              | Implemented locally; migration and Neon verification required before deployment  |
| 3. Household member module | Strong                       | Not implemented; revisit alongside member functionality                          |
| 4. Settings data assembly  | Speculative                  | Not implemented; defer until the need is clearer                                 |

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

Not implemented by PR 55. Revisit when extending household member functionality. The original assessment remains strong, but there is no need to bundle it with period-write changes. Reassess its overlap with candidate 4 before introducing separate modules for both.

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

Not implemented by PR 55. Defer this speculative candidate until the need is clearer, especially after any household member work. Avoid introducing it solely to complete the report.

## Next steps

Finish environment verification and review of candidate 2 before deployment. Candidates 3 and 4 should be reassessed when their affected functionality changes. Previously identified dependency security alerts should be checked separately; they are not findings from the original architecture report.

### Pre-review follow-up

The local follow-up protects pending transfer confirmations from dialog close/reopen, excludes inactive definitions from expected withdrawals and uses the shared Select primitives. Regression coverage includes slow confirmations, inactive allocated expenses, and both allocated/replacement reserves retaining confirmed values through a conversion to direct expense. The planned release is 0.9.0 (new functionality). ADR 0004 and the release runbook define the first-write compatibility boundary: older month-only applications must not resume editing after exact-date writes. Migration/RLS verification against Neon remains required before merge; no external deployment or access restriction has been performed locally.
