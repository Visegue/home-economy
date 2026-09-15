import { describe, expect, it } from "vitest";
import {
  incomeFromDatabase,
  incomeToDatabase,
  monthlyIncomeInputSchema,
} from "./validation";

describe("monthly net income in SEK", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["0", 0],
    ["32500", 3_250_000],
    ["32 500,75", 3_250_075],
    ["32500.5", 3_250_050],
    ["0,29", 29],
    ["32\u00a0500,75", 3_250_075],
    ["999999999999,99", 99_999_999_999_999],
  ])("parses %s without losing öre", (input, expected) => {
    expect(monthlyIncomeInputSchema.parse(input)).toBe(expected);
    expect(incomeFromDatabase(incomeToDatabase(expected))).toBe(expected);
  });

  it.each([
    "-1",
    "1,234",
    "1e5",
    "NaN",
    "Infinity",
    "1 2",
    "32.500,50",
    "1000000000000",
    "abc",
  ])("rejects %s", (input) => {
    expect(monthlyIncomeInputSchema.safeParse(input).success).toBe(false);
  });
});
