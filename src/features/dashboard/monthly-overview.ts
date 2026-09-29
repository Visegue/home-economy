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
      const incomes = budget.incomes.filter((income) =>
        isActiveInPeriod(period, income),
      );
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
        incomes,
        savingsContributionsInOre,
      );

      return {
        period,
        household: budget.household,
        people: budget.people,
        expenses: summary.expenses,
        incomes,
        savings,
        totals: {
          incomeInOre: summary.incomeInOre,
          directExpensesInOre: summary.directInOre,
          monthlyAllocationsInOre: summary.allocatedInOre,
          expensesInOre: summary.totalInOre,
          savingsContributionsInOre,
          transfersInOre: summary.allocatedInOre + savingsContributionsInOre,
          monthlyRemainderInOre: summary.remainingInOre,
        },
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
