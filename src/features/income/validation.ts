import { z } from "zod";

export const MAX_MONTHLY_INCOME_IN_ORE = 99_999_999_999_999;

export const monthlyIncomeInOreSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_MONTHLY_INCOME_IN_ORE)
  .nullable();

// Accept Swedish grouping and decimal commas without floating-point arithmetic.
export const monthlyIncomeInputSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    if (value === "") return null;
    if (
      !/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.]\d{1,2})?$/.test(value)
    ) {
      context.addIssue({
        code: "custom",
        message: "Ange ett positivt belopp eller 0, med högst två decimaler.",
      });
      return z.NEVER;
    }
    const [kronor, decimals = ""] = value
      .replace(/[ \u00a0\u202f]/g, "")
      .split(/[,.]/);
    const amountInOre = Number(kronor) * 100 + Number(decimals.padEnd(2, "0"));
    if (!monthlyIncomeInOreSchema.safeParse(amountInOre).success) {
      context.addIssue({
        code: "custom",
        message: "Beloppet är för stort. Ange högst 999 999 999 999,99 kr.",
      });
      return z.NEVER;
    }
    return amountInOre;
  });

export function incomeToDatabase(amountInOre: number | null): string | null {
  monthlyIncomeInOreSchema.parse(amountInOre);
  if (amountInOre === null) return null;
  return `${Math.floor(amountInOre / 100)}.${String(amountInOre % 100).padStart(2, "0")}`;
}

export function incomeFromDatabase(value: string | null): number | null {
  return value === null ? null : monthlyIncomeInputSchema.parse(value);
}

export function incomeToInput(amountInOre: number | null): string {
  return incomeToDatabase(amountInOre)?.replace(".", ",") ?? "";
}
