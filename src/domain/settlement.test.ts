import { describe, expect, it } from "vitest";
import {
  settlementContribution,
  settlementForecast,
  type SettlementPlan,
} from "./settlement";

const plan: SettlementPlan = {
  startsOn: "2026-01-01",
  markupAmountInOre: null,
  markupPercent: 10,
  inflationPercent: 2,
};

describe("settlement forecasts", () => {
  it("applies the markup before compound annual inflation", () => {
    expect(
      settlementForecast(1_200_000, plan.startsOn, "2028-01-01", plan),
    ).toEqual({ targetInOre: 1_373_328, months: 24, monthlyInOre: 57_222 });
  });
  it("supports an absolute markup and fractional years", () => {
    const forecast = settlementForecast(100_000, plan.startsOn, "2027-07-20", {
      markupAmountInOre: 20_000,
      markupPercent: null,
      inflationPercent: 4,
    });
    expect(forecast.targetInOre).toBe(Math.round(120_000 * 1.04 ** 1.5));
    expect(forecast.months).toBe(18);
  });
  it("rounds a half öre markup upwards", () => {
    expect(
      settlementForecast(100, plan.startsOn, "2027-01-01", {
        markupAmountInOre: null,
        markupPercent: 0.5,
        inflationPercent: null,
      }).targetInOre,
    ).toBe(101);
  });
  it("can disable either adjustment independently", () => {
    expect(
      settlementForecast(100_000, plan.startsOn, "2027-01-01", {
        ...plan,
        markupPercent: null,
      }).targetInOre,
    ).toBe(102_000);
    expect(
      settlementForecast(100_000, plan.startsOn, "2027-01-01", {
        ...plan,
        inflationPercent: null,
      }).targetInOre,
    ).toBe(110_000);
    expect(
      settlementForecast(100_000, plan.startsOn, "2027-01-01", {
        ...plan,
        markupPercent: null,
        inflationPercent: null,
      }).targetInOre,
    ).toBe(100_000);
  });
  it("rejects overflow, conflicting markups and invalid inputs", () => {
    expect(() =>
      settlementForecast(99_999_999_999_999, plan.startsOn, "2199-01-01", plan),
    ).toThrow("för stort");
    for (const change of [
      { markupAmountInOre: 100 },
      { markupPercent: -1 },
      { inflationPercent: Infinity },
    ]) {
      expect(() =>
        settlementForecast(100, plan.startsOn, "2027-01-01", {
          ...plan,
          ...change,
        }),
      ).toThrow("Ange giltiga belopp");
    }
    expect(() =>
      settlementForecast(100, plan.startsOn, "2025-12-01", plan),
    ).toThrow("Ange giltiga belopp");
  });
  it("keeps a stable monthly contribution and adjusts final öre exactly", () => {
    const plain = { ...plan, markupPercent: null, inflationPercent: null };
    expect(
      ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2027-04"].map(
        (period) => settlementContribution(period, 10_000, "2026-04-01", plain),
      ),
    ).toEqual([0, 3334, 3334, 3332, 0, 0]);
  });
  it("funds a payment in the starting month in a single transfer", () => {
    expect(
      settlementForecast(100_000, plan.startsOn, "2026-01-31", plan),
    ).toEqual({ targetInOre: 110_000, months: 1, monthlyInOre: 110_000 });
    expect(settlementContribution("2026-01", 100_000, "2026-01-31", plan)).toBe(
      110_000,
    );
    expect(settlementContribution("2026-02", 100_000, "2026-01-31", plan)).toBe(
      0,
    );
  });
});
