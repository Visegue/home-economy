import { z } from "zod";
import { monthlyEquivalent, type CadenceUnit } from "@/domain/budget";
import {
  defaultMemberColor,
  type HouseholdPerson,
} from "@/features/households/member-appearance";

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ange medlemmens namn.")
    .max(120, "Namnet får vara högst 120 tecken."),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Välj en giltig färg.")
    .transform((color) => color.toLowerCase())
    .default(defaultMemberColor),
});

export const periodSchema = z
  .string()
  .regex(/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/, "Välj en giltig månad.");
export const amountSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(?:[,.]\d{1,2})?$/,
    "Ange ett belopp i kronor med högst två decimaler.",
  )
  .transform((value) => {
    const [kronor, ore = ""] = value.replace(",", ".").split(".");
    return Number(kronor) * 100 + Number(ore.padEnd(2, "0"));
  });
export const cycles = [
  { months: 2, label: "Varannan månad" },
  { months: 3, label: "Kvartalsvis" },
  { months: 6, label: "Halvårsvis" },
  { months: 12, label: "Årsvis" },
  { months: 24, label: "Vartannat år" },
] as const;
const dateSchema = z.iso.date({ error: "Ange ett giltigt betalningsdatum." });
export const expenseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Ange ett namn på utgiften.")
      .max(160, "Namnet får vara högst 160 tecken."),
    amount: amountSchema.refine(
      (amount) => amount > 0,
      "Beloppet måste vara större än noll.",
    ),
    period: periodSchema,
    type: z.enum(["direct", "allocated"]),
    months: z.coerce.number(),
    nextDueOn: z.string(),
    ownerIds: z
      .array(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER))
      .max(100),
  })
  .superRefine((value, context) => {
    if (value.type !== "allocated") return;
    if (!cycles.some((cycle) => cycle.months === value.months)) {
      context.addIssue({
        code: "custom",
        message: "Välj hur ofta kostnaden uppstår.",
        path: ["months"],
      });
    }
    if (
      !dateSchema.safeParse(value.nextDueOn).success ||
      value.nextDueOn < `${value.period}-01`
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Nästa betalning måste vara ett giltigt datum från och med startmånaden.",
        path: ["nextDueOn"],
      });
    }
  });
export type ExpenseInput = z.infer<typeof expenseSchema>;
export interface BudgetExpense {
  id: number;
  name: string;
  amountInOre: number;
  unit: CadenceUnit;
  every: number;
  destination: "direct" | "allocated";
  startsOn: string | null;
  endsOn: string | null;
  nextDueOn: string | null;
  owners: HouseholdPerson[];
}
export const incomeSchema = z
  .object({
    id: z.coerce
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    name: z
      .string()
      .trim()
      .min(1, "Ange ett namn på inkomsten.")
      .max(160, "Namnet får vara högst 160 tecken."),
    amount: amountSchema,
    startsOn: periodSchema,
    endsOn: z
      .union([periodSchema, z.literal("")])
      .transform((value) => value || null),
  })
  .refine((income) => !income.endsOn || income.endsOn >= income.startsOn, {
    message: "Slutmånaden får inte vara före startmånaden.",
    path: ["endsOn"],
  });
export type IncomeInput = z.infer<typeof incomeSchema>;
export interface BudgetIncome {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string | null;
  amountInOre: number;
}

export function currentPeriod() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}
export function monthLabel(period: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
}
export function shiftPeriod(period: string, months: number) {
  const date = new Date(`${period}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 7);
}
export function isActiveInPeriod(
  period: string,
  item: { startsOn: string | null; endsOn: string | null },
) {
  return (
    (!item.startsOn || item.startsOn.slice(0, 7) <= period) &&
    (!item.endsOn || item.endsOn.slice(0, 7) >= period)
  );
}
export function monthlySummary(
  period: string,
  expenses: BudgetExpense[],
  incomes: BudgetIncome[],
  savingsInOre = 0,
) {
  const activeExpenses = expenses.filter((expense) =>
    isActiveInPeriod(period, expense),
  );
  let directInOre = 0;
  let allocatedInOre = 0;
  for (const expense of activeExpenses) {
    const amount = monthlyEquivalent(expense);
    if (expense.destination === "allocated") allocatedInOre += amount;
    else directInOre += amount;
  }
  const activeIncomes = incomes.filter(
    (income) =>
      income.startsOn <= period && (!income.endsOn || income.endsOn >= period),
  );
  const incomeInOre = activeIncomes.length
    ? activeIncomes.reduce((total, income) => total + income.amountInOre, 0)
    : null;
  const totalInOre = directInOre + allocatedInOre;
  return {
    expenses: activeExpenses,
    incomeInOre,
    directInOre,
    allocatedInOre,
    totalInOre,
    savingsInOre,
    remainingInOre:
      incomeInOre === null ? null : incomeInOre - totalInOre - savingsInOre,
  };
}
