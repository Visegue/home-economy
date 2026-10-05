import "server-only";

import { withAuthenticatedDatabase } from "@/db/authorized";
import { readBudgetData } from "@/features/budget/data";
import { monthlySummary, periodSchema } from "@/features/budget/model";
import { readSavings } from "@/features/savings/data";
import { readTransfers } from "@/features/funding/data";
import { fundingProgress, valueOn } from "@/features/funding/model";
import {
  currentDate,
  monthEnd,
  selectMonthlyVersions,
} from "@/features/periods/model";

/** Monthly expectations and recorded earmarked values, never bank account balances. */
export async function getMonthlyOverview(period: string) {
  periodSchema.parse(period);

  return withAuthenticatedDatabase(
    async (transaction, user) => {
      // All reads share a connection and snapshot, including the RLS context.
      const budget = await readBudgetData(transaction, user.id);
      const allSavings = await readSavings(transaction, user.id);
      const transfers = await readTransfers(transaction, budget.household.id);
      const today = currentDate();
      const valueDate = period < today.slice(0, 7) ? monthEnd(period) : today;
      function funding(itemId: string | null | undefined, planned: number) {
        const movements = itemId
          ? transfers.filter((transfer) => transfer.itemId === itemId)
          : [];
        return {
          valueInOre: valueOn(movements, valueDate),
          hasOpening: movements.some(
            (transfer) =>
              transfer.kind === "opening" && transfer.occurredOn <= valueDate,
          ),
          progress: fundingProgress(movements, period, planned),
          transfers: movements,
        };
      }
      const savings = selectMonthlyVersions(period, allSavings).map(
        ({ display, basis, changes, ended }) => ({
          ...display,
          displayAmountInOre: display.amountInOre,
          amountInOre: basis?.amountInOre ?? 0,
          changes,
          ended,
          funding: funding(display.itemId, basis?.amountInOre ?? 0),
        }),
      );

      const savingsContributionsInOre = savings.reduce(
        (sum, saving) => sum + saving.amountInOre,
        0,
      );
      const summary = monthlySummary(
        period,
        budget.expenses,
        budget.incomes,
        savingsContributionsInOre,
      );
      const expenses = summary.expenses.map((expense) => ({
        ...expense,
        funding: funding(
          expense.itemId,
          expense.contributionDestination === "direct"
            ? 0
            : expense.monthlyAmountInOre,
        ),
      }));
      const allocatedExpenses = expenses.filter(
        (expense) => expense.contributionDestination === "allocated",
      );
      const replacementReserves = expenses.filter(
        (expense) => expense.contributionDestination === "settlement",
      );
      function recordedTotal(rows: { funding: ReturnType<typeof funding> }[]) {
        return {
          valueInOre: rows.reduce(
            (sum, row) => sum + row.funding.valueInOre,
            0,
          ),
          hasMissingOpening: rows.some((row) => !row.funding.hasOpening),
        };
      }

      return {
        period,
        valueDate,
        household: budget.household,
        people: budget.people,
        expenses,
        directExpenses: expenses.filter(
          (expense) => expense.contributionDestination === "direct",
        ),
        allocatedExpenses,
        regularExpenses: expenses.filter(
          (expense) => expense.contributionDestination !== "settlement",
        ),
        replacementReserves,
        incomes: summary.incomes,
        savings,
        recordedTotals: {
          allocated: recordedTotal(allocatedExpenses),
          replacements: recordedTotal(replacementReserves),
          savings: recordedTotal(savings),
        },
        totals: {
          incomeInOre: summary.incomeInOre,
          directExpensesInOre: summary.directInOre,
          monthlyAllocationsInOre: summary.allocatedInOre,
          regularExpensesInOre: summary.directInOre + summary.allocatedInOre,
          replacementContributionsInOre: summary.settlementInOre,
          expensesInOre: summary.totalInOre,
          savingsContributionsInOre,
          transfersInOre:
            summary.allocatedInOre +
            summary.settlementInOre +
            savingsContributionsInOre,
          monthlyRemainderInOre: summary.remainingInOre,
        },
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
