import { z } from "zod";
import {
  monthlyIncomeInputSchema,
  monthlyIncomeInOreSchema,
} from "@/features/income/validation";

export const savingIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const nameSchema = z
  .string()
  .trim()
  .min(1, "Ange ett namn på sparandet.")
  .max(160, "Namnet får vara högst 160 tecken.");

export const savingInputSchema = z.object({
  name: nameSchema,
  amountInOre: monthlyIncomeInputSchema.pipe(
    z.number({ error: "Ange ett månadsbelopp." }),
  ),
});

export const savingSchema = z.object({
  name: nameSchema,
  amountInOre: monthlyIncomeInOreSchema.unwrap(),
});

export interface Saving {
  id: number;
  name: string;
  amountInOre: number;
}

export function totalMonthlySavings(savings: Saving[]): number {
  return savings.reduce((total, saving) => total + saving.amountInOre, 0);
}

const savingsFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatSavingsAmount(amountInOre: number): string {
  return savingsFormatter.format(amountInOre / 100);
}
