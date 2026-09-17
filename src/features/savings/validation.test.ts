import { describe, expect, it } from "vitest";
import {
  formatSavingsAmount,
  savingInputSchema,
  totalMonthlySavings,
} from "./validation";

describe("monthly savings", () => {
  it("requires a name and amount and preserves Swedish öre", () => {
    expect(
      savingInputSchema.parse({
        name: "  Semester  ",
        amountInOre: "1 250,75",
      }),
    ).toEqual({ name: "Semester", amountInOre: 125075 });
    for (const amountInOre of ["", "-1", "1,234", "NaN", "1000000000000"]) {
      expect(
        savingInputSchema.safeParse({ name: "Buffert", amountInOre }).success,
      ).toBe(false);
    }
    expect(
      savingInputSchema.safeParse({ name: "  ", amountInOre: "100" }).success,
    ).toBe(false);
    expect(
      savingInputSchema.parse({ name: "Buffert", amountInOre: "0" })
        .amountInOre,
    ).toBe(0);
  });

  it("sums monthly transfers in integer öre, including an empty plan", () => {
    expect(totalMonthlySavings([], "2026-09")).toBe(0);
    expect(
      totalMonthlySavings(
        [
          {
            id: 1,
            name: "Buffert",
            amountInOre: 125075,
            startsOn: null,
            endsOn: null,
          },
          {
            id: 2,
            name: "Semester",
            amountInOre: 50029,
            startsOn: "2026-09",
            endsOn: "2026-12",
          },
        ],
        "2026-09",
      ),
    ).toBe(175104);
    expect(formatSavingsAmount(175104).replace(/\s/g, " ")).toBe("1 751,04 kr");
  });
  it("only sums savings within their inclusive validity period", () => {
    const savings = [
      {
        id: 1,
        name: "Buffert",
        amountInOre: 125075,
        startsOn: "2026-09",
        endsOn: "2026-12",
      },
    ];
    expect(totalMonthlySavings(savings, "2026-08")).toBe(0);
    expect(totalMonthlySavings(savings, "2026-09")).toBe(125075);
    expect(totalMonthlySavings(savings, "2026-12")).toBe(125075);
    expect(totalMonthlySavings(savings, "2027-01")).toBe(0);
  });
});
