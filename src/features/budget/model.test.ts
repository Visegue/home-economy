import { describe, expect, it } from "vitest";
import {
  amountSchema,
  expenseSchema,
  incomeSchema,
  type BudgetIncome,
  monthlySummary,
  shiftPeriod,
  type BudgetExpense,
} from "./model";

const expense: BudgetExpense = {
  id: 1,
  name: "Försäkring",
  amountInOre: 120_000,
  unit: "month",
  every: 12,
  destination: "allocated",
  startsOn: "2026-09-01",
  endsOn: null,
  nextDueOn: "2027-08-31",
  owners: [
    { id: 1, name: "Kim" },
    { id: 2, name: "Robin" },
  ],
};

describe("monthly budget", () => {
  it("includes the final expense month and excludes subsequent months", () => {
    const ended = { ...expense, endsOn: "2026-12-01" };
    expect(monthlySummary("2026-12", [ended], []).totalInOre).toBe(10000);
    expect(monthlySummary("2027-01", [ended], []).totalInOre).toBe(0);
  });
  it.each([
    [2, 60_000],
    [3, 40_000],
    [6, 20_000],
    [12, 10_000],
    [24, 5_000],
  ])("spreads expenses over %i months", (every, expected) => {
    const summary = monthlySummary("2026-09", [{ ...expense, every }], []);
    expect(summary.allocatedInOre).toBe(expected);
  });
  it("counts a shared expense once and does not double-count its payment", () => {
    const direct = {
      ...expense,
      id: 2,
      every: 1,
      amountInOre: 100_000,
      destination: "direct" as const,
    };
    expect(
      monthlySummary(
        "2027-08",
        [expense, direct],
        [
          {
            id: 1,
            name: "Lön",
            startsOn: "2027-08",
            endsOn: "2027-08",
            amountInOre: 200_000,
          },
        ],
      ),
    ).toMatchObject({
      incomeInOre: 200_000,
      directInOre: 100_000,
      allocatedInOre: 10_000,
      totalInOre: 110_000,
      remainingInOre: 90_000,
    });
  });
  it("respects the start month and distinguishes missing income from zero", () => {
    expect(monthlySummary("2026-08", [expense], []).totalInOre).toBe(0);
    expect(monthlySummary("2026-09", [expense], []).remainingInOre).toBeNull();
    expect(
      monthlySummary(
        "2026-09",
        [expense],
        [
          {
            id: 1,
            name: "Lön",
            startsOn: "2026-09",
            endsOn: "2026-09",
            amountInOre: 0,
          },
        ],
      ).remainingInOre,
    ).toBe(-10_000);
    expect(
      monthlySummary(
        "2026-10",
        [expense],
        [
          {
            id: 1,
            name: "Lön",
            startsOn: "2026-09",
            endsOn: "2026-09",
            amountInOre: 99_999,
          },
        ],
      ).incomeInOre,
    ).toBeNull();
  });
  it("subtracts savings once while keeping expenses and allocations separate", () => {
    const incomes: BudgetIncome[] = [
      {
        id: 1,
        name: "Lön",
        startsOn: "2026-09",
        endsOn: null,
        amountInOre: 200_000,
      },
    ];
    const summary = monthlySummary("2026-09", [expense], incomes, 25_075);
    expect(summary).toMatchObject({
      allocatedInOre: 10_000,
      totalInOre: 10_000,
      savingsInOre: 25_075,
      remainingInOre: 164_925,
    });
    expect(
      monthlySummary("2026-10", [expense], incomes, 200_001).remainingInOre,
    ).toBe(-10_001);
    expect(
      monthlySummary("2026-08", [], incomes, 25_075).remainingInOre,
    ).toBeNull();
  });
  it("rounds each monthly transfer to öre so rows add up", () => {
    expect(
      monthlySummary(
        "2026-09",
        [
          { ...expense, amountInOre: 100 },
          { ...expense, id: 2, amountInOre: 100 },
        ],
        [],
      ).totalInOre,
    ).toBe(16);
  });
  it("navigates across years", () => {
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
  });
});

describe("budget validation", () => {
  it.each([
    ["100,01", 10_001],
    ["1.10", 110],
    ["0", 0],
    ["999999999999,99", 99_999_999_999_999],
  ])("parses %s in integer öre", (input, expected) => {
    expect(amountSchema.parse(input)).toBe(expected);
  });
  it.each(["-1", "Infinity", "1e3", "1,001", "", "1000000000000", "12foo"])(
    "rejects invalid amount %s",
    (value) => {
      expect(amountSchema.safeParse(value).success).toBe(false);
    },
  );
  const input = {
    name: "Försäkring",
    amount: "1200",
    period: "2026-09",
    type: "allocated",
    months: "12",
    nextDueOn: "2027-08-31",
    ownerIds: ["1", "2"],
  };
  it("validates cycle, real payment date, start month and owners", () => {
    expect(expenseSchema.safeParse(input).success).toBe(true);
    for (const invalid of [
      { months: "0" },
      { months: "5" },
      { nextDueOn: "2027-02-30" },
      { nextDueOn: "2026-08-31" },
      { nextDueOn: "" },
      { ownerIds: ["-1"] },
      { amount: "0" },
      { name: "  " },
      { period: "2026-13" },
    ]) {
      expect(expenseSchema.safeParse({ ...input, ...invalid }).success).toBe(
        false,
      );
    }
    expect(
      expenseSchema.safeParse({
        ...input,
        type: "direct",
        months: null,
        nextDueOn: "",
        ownerIds: [],
      }).success,
    ).toBe(true);
  });
});

describe("household income periods", () => {
  const salary: BudgetIncome = {
    id: 1,
    name: "Lön",
    startsOn: "2026-09",
    endsOn: "2026-12",
    amountInOre: 3_000_000,
  };
  const allowance: BudgetIncome = {
    id: 2,
    name: "Bidrag",
    startsOn: "2026-10",
    endsOn: null,
    amountInOre: 125_050,
  };
  it("sums overlapping sources and includes both boundary months", () => {
    const incomes = [salary, allowance];
    expect(monthlySummary("2026-08", [], incomes).incomeInOre).toBeNull();
    expect(monthlySummary("2026-09", [], incomes).incomeInOre).toBe(3_000_000);
    expect(monthlySummary("2026-10", [], incomes).incomeInOre).toBe(3_125_050);
    expect(monthlySummary("2026-12", [], incomes).incomeInOre).toBe(3_125_050);
    expect(monthlySummary("2027-01", [], incomes).incomeInOre).toBe(125_050);
    expect(monthlySummary("2030-06", [], incomes).incomeInOre).toBe(125_050);
  });
  it("keeps old salary months when a new amount starts", () => {
    const replacement = {
      ...salary,
      id: 3,
      startsOn: "2027-01",
      endsOn: null,
      amountInOre: 3_200_000,
    };
    expect(
      monthlySummary("2026-12", [], [salary, replacement]).incomeInOre,
    ).toBe(3_000_000);
    expect(
      monthlySummary("2027-01", [], [salary, replacement]).incomeInOre,
    ).toBe(3_200_000);
  });
  it("validates periods and accepts a single month or no end month", () => {
    const input = {
      name: "Lön",
      amount: "30000,50",
      startsOn: "2026-09",
      endsOn: "",
    };
    expect(incomeSchema.parse(input)).toMatchObject({
      amount: 3_000_050,
      endsOn: null,
    });
    expect(
      incomeSchema.safeParse({ ...input, endsOn: "2026-09" }).success,
    ).toBe(true);
    for (const change of [
      { endsOn: "2026-08" },
      { startsOn: "2026-13" },
      { name: " " },
      { amount: "-1" },
      { id: -1 },
    ])
      expect(incomeSchema.safeParse({ ...input, ...change }).success).toBe(
        false,
      );
  });
});
