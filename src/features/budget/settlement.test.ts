import { describe, expect, it } from "vitest";
import { expenseSchema, monthlySummary, type BudgetExpense } from "./model";

const input = {
  name: "Vitvaror",
  amount: "12000",
  period: "2026-01",
  type: "settlement",
  months: 0,
  nextDueOn: "2028-01-01",
  ownerIds: [1, 2],
  settlement: {
    markupAmountInOre: null,
    markupPercent: "10",
    inflationPercent: "2",
  },
};

describe("settlement budget integration", () => {
  it("validates dates, adjustments and forecast limits", () => {
    expect(expenseSchema.parse(input).settlement).toEqual({
      markupAmountInOre: null,
      markupPercent: 10,
      inflationPercent: 2,
    });
    for (const change of [
      { nextDueOn: "2028-02-30" },
      { nextDueOn: "2025-12-31" },
      { nextDueOn: "" },
      { settlement: undefined },
      { amount: "0" },
      { amount: "999999999999.99" },
      { settlement: { ...input.settlement, markupPercent: "101" } },
      { settlement: { ...input.settlement, inflationPercent: "-1" } },
      { settlement: { ...input.settlement, markupAmountInOre: "50" } },
    ])
      expect(expenseSchema.safeParse({ ...input, ...change }).success).toBe(
        false,
      );
    expect(
      expenseSchema.safeParse({
        ...input,
        settlement: {
          markupAmountInOre: "25,50",
          markupPercent: null,
          inflationPercent: null,
        },
      }).success,
    ).toBe(true);
  });

  const expense: BudgetExpense = {
    id: 1,
    name: "Vitvaror",
    amountInOre: 1_200_000,
    every: 1,
    unit: "month",
    destination: "settlement",
    startsOn: "2026-01-01",
    endsOn: null,
    nextDueOn: "2028-01-01",
    owners: [
      { id: 1, name: "Kim", color: "#d5b8ca" },
      { id: 2, name: "Robin", color: "#d5b8ca" },
    ],
    settlement: {
      startsOn: "2026-01-01",
      markupAmountInOre: null,
      markupPercent: 10,
      inflationPercent: 2,
    },
  };
  it("counts shared settlements once, separately from regular allocations and savings", () => {
    const summary = monthlySummary(
      "2026-01",
      [expense, { ...expense, id: 2, destination: "allocated", every: 12 }],
      [
        {
          id: 1,
          name: "Lön",
          startsOn: "2026-01",
          endsOn: null,
          amountInOre: 500_000,
        },
      ],
      50_000,
    );
    expect(summary).toMatchObject({
      directInOre: 0,
      allocatedInOre: 100_000,
      settlementInOre: 57_222,
      totalInOre: 157_222,
      remainingInOre: 292_778,
    });
    expect(monthlySummary("2027-12", [expense], []).settlementInOre).toBe(
      57_222,
    );
    expect(monthlySummary("2028-01", [expense], []).settlementInOre).toBe(0);
    expect(monthlySummary("2028-01", [expense], []).expenses).toHaveLength(1);
  });
  it("respects validity while retaining the original calculation anchor on revisions", () => {
    const ended = { ...expense, endsOn: "2026-06-01" };
    const revised = {
      ...expense,
      id: 2,
      name: "Nytt namn",
      startsOn: "2026-07-01",
    };
    expect(monthlySummary("2025-12", [ended, revised], []).totalInOre).toBe(0);
    expect(
      monthlySummary("2026-06", [ended, revised], []).settlementInOre,
    ).toBe(57_222);
    expect(
      monthlySummary("2026-07", [ended, revised], []).settlementInOre,
    ).toBe(57_222);
  });
  it("retains the earlier contribution when the purpose becomes a direct expense after the scheduled day", () => {
    const versions = [
      {
        ...expense,
        itemId: "same",
        scheduledDay: 15,
        effectiveThrough: "2026-09-19",
      },
      {
        ...expense,
        id: 2,
        itemId: "same",
        scheduledDay: 15,
        effectiveFrom: "2026-09-20",
        destination: "direct" as const,
        settlement: null,
        nextDueOn: null,
        amountInOre: 100_000,
      },
    ];
    const summary = monthlySummary("2026-09", versions, []);
    expect(summary.expenses).toHaveLength(1);
    expect(summary.expenses[0]).toMatchObject({
      destination: "direct",
      contributionDestination: "settlement",
      monthlyAmountInOre: 57_222,
    });
    expect(summary.settlementInOre).toBe(57_222);
    expect(summary.directInOre).toBe(0);
  });
});
