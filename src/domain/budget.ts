export type CadenceUnit = "week" | "month" | "year";

export interface RecurringBudgetItem {
  amountInOre: number;
  every: number;
  unit: CadenceUnit;
}

export interface MonthlyPlan {
  plannedInOre: number;
  availableInOre: number;
}

export function monthlyEquivalent(item: RecurringBudgetItem): number {
  if (item.every <= 0) {
    throw new RangeError("Intervallet måste vara större än noll.");
  }

  const occurrencesPerMonth = {
    week: 52 / 12 / item.every,
    month: 1 / item.every,
    year: 1 / 12 / item.every,
  }[item.unit];

  return Math.round(item.amountInOre * occurrencesPerMonth);
}

export function calculateMonthlyPlan(
  incomeInOre: number,
  items: RecurringBudgetItem[],
): MonthlyPlan {
  const plannedInOre = items.reduce(
    (total, item) => total + monthlyEquivalent(item),
    0,
  );

  return {
    plannedInOre,
    availableInOre: incomeInOre - plannedInOre,
  };
}
