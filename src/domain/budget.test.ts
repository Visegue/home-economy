import { describe, expect, it } from "vitest";

import { calculateMonthlyPlan, monthlyEquivalent } from "./budget";

describe("monthlyEquivalent", () => {
  it("fördelar en årskostnad över tolv månader", () => {
    expect(
      monthlyEquivalent({ amountInOre: 12_000_00, every: 1, unit: "year" }),
    ).toBe(100_000);
  });

  it("räknar om en veckokostnad", () => {
    expect(
      monthlyEquivalent({ amountInOre: 1_000_00, every: 1, unit: "week" }),
    ).toBe(433_333);
  });

  it("avvisar ett ogiltigt intervall", () => {
    expect(() =>
      monthlyEquivalent({ amountInOre: 100, every: 0, unit: "month" }),
    ).toThrow(RangeError);
  });
});

describe("calculateMonthlyPlan", () => {
  it("visar hur mycket som återstår efter planen", () => {
    expect(
      calculateMonthlyPlan(50_000_00, [
        { amountInOre: 10_000_00, every: 1, unit: "month" },
        { amountInOre: 12_000_00, every: 1, unit: "year" },
      ]),
    ).toEqual({ plannedInOre: 11_000_00, availableInOre: 39_000_00 });
  });
});
