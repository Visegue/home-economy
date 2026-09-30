import "server-only";

import { withAuthenticatedDatabase } from "@/db/authorized";
import { readBudgetData } from "@/features/budget/data";
import {
  isActiveInPeriod,
  monthlySummary,
  periodSchema,
} from "@/features/budget/model";
import { readSavings } from "@/features/savings/data";

/** Expected monthly amounts, not recorded payments or account balances. */
export async function getMonthlyOverview(period: string) {
  periodSchema.parse(period);

  return withAuthenticatedDatabase(
    async (transaction, user) => {
      // Both reads use the same connection and snapshot, including the RLS context.
      const budget = await readBudgetData(transaction, user.id);
      const allSavings = await readSavings(transaction, user.id);
      const savings = allSavings.filter((saving) =>
        isActiveInPeriod(period, saving),
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

      return {
        period,
        household: budget.household,
        people: budget.people,
        expenses: summary.expenses,
        regularExpenses: summary.expenses.filter(
          (expense) => expense.destination !== "settlement",
        ),
        replacementReserves: summary.expenses.filter(
          (expense) => expense.destination === "settlement",
        ),
        incomes: summary.incomes,
        savings,
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
