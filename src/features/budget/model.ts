import { z } from "zod";
import {
  effectiveDateSchema,
  writeOptionsSchema,
  selectMonthlyVersions,
  type VersionMetadata,
} from "@/features/periods/model";
import { monthlyEquivalent, type CadenceUnit } from "@/domain/budget";
import {
  settlementContribution,
  settlementForecast,
  type SettlementPlan,
} from "@/domain/settlement";
import type { HouseholdPerson } from "@/features/households/member-appearance";

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
    .optional(),
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
const percentageSchema = amountSchema
  .transform((value) => value / 100)
  .refine((value) => value <= 100, "Ange en procentsats mellan 0 och 100.");
export const settlementAdjustmentsSchema = z
  .object({
    markupAmountInOre: amountSchema.nullable(),
    markupPercent: percentageSchema.nullable(),
    inflationPercent: percentageSchema.nullable(),
  })
  .refine(
    (value) => value.markupAmountInOre === null || value.markupPercent === null,
    {
      message: "Välj påslag i kronor eller procent, inte båda.",
    },
  );
export const expenseSchema = z
  .object({
    ...writeOptionsSchema.shape,
    name: z
      .string()
      .trim()
      .min(1, "Ange ett namn på utgiften.")
      .max(160, "Namnet får vara högst 160 tecken."),
    amount: amountSchema.refine(
      (amount) => amount > 0,
      "Beloppet måste vara större än noll.",
    ),
    period: effectiveDateSchema,
    type: z.enum(["direct", "allocated", "settlement"]),
    settlement: settlementAdjustmentsSchema.optional(),
    months: z.coerce.number(),
    nextDueOn: z.string(),
    ownerIds: z
      .array(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER))
      .max(100),
  })
  .superRefine((value, context) => {
    if (value.type === "direct") return;
    if (
      value.type === "allocated" &&
      !cycles.some((cycle) => cycle.months === value.months)
    ) {
      context.addIssue({
        code: "custom",
        message: "Välj hur ofta kostnaden uppstår.",
        path: ["months"],
      });
      return;
    }
    if (value.type === "settlement") {
      try {
        if (!value.settlement)
          throw new Error("Ange avräkningens påslag och inflation.");
        settlementForecast(
          value.amount,
          `${value.period.slice(0, 7)}-01`,
          value.nextDueOn,
          value.settlement,
        );
      } catch (error) {
        context.addIssue({
          code: "custom",
          message:
            error instanceof Error ? error.message : "Ogiltig avräkning.",
          path: ["settlement"],
        });
      }
    }
    if (
      !dateSchema.safeParse(value.nextDueOn).success ||
      value.nextDueOn < `${value.period.slice(0, 7)}-01`
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
export interface BudgetExpense extends VersionMetadata {
  id: number;
  name: string;
  amountInOre: number;
  unit: CadenceUnit;
  every: number;
  destination: "direct" | "allocated" | "settlement";
  settlement?: SettlementPlan | null;
  startsOn: string | null;
  endsOn: string | null;
  nextDueOn: string | null;
  owners: HouseholdPerson[];
}
export const incomeSchema = z
  .object({
    ...writeOptionsSchema.shape,
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
    startsOn: effectiveDateSchema,
    endsOn: z
      .union([effectiveDateSchema, z.literal("")])
      .transform((value) => value || null),
  })
  .refine((income) => !income.endsOn || income.endsOn >= income.startsOn, {
    message: "Slutmånaden får inte vara före startmånaden.",
    path: ["endsOn"],
  });
export type IncomeInput = z.infer<typeof incomeSchema>;
export interface BudgetIncome extends VersionMetadata {
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
  const activeExpenses = selectMonthlyVersions(period, expenses).map(
    ({ display, basis, changes, ended }) => ({
      ...display,
      monthlyAmountInOre: basis ? monthlyExpenseAmount(period, basis) : 0,
      contributionDestination: basis?.destination ?? display.destination,
      changes,
      ended,
    }),
  );
  let directInOre = 0;
  let allocatedInOre = 0;
  let settlementInOre = 0;
  for (const expense of activeExpenses) {
    const amount = expense.monthlyAmountInOre;
    if (expense.contributionDestination === "settlement")
      settlementInOre += amount;
    else if (expense.contributionDestination === "allocated")
      allocatedInOre += amount;
    else directInOre += amount;
  }
  const activeIncomes = selectMonthlyVersions(period, incomes).map(
    ({ display, basis, changes, ended }) => ({
      ...display,
      monthlyAmountInOre: basis?.amountInOre ?? 0,
      changes,
      ended,
    }),
  );
  const incomeInOre = activeIncomes.length
    ? activeIncomes.reduce(
        (total, income) => total + income.monthlyAmountInOre,
        0,
      )
    : null;
  const totalInOre = directInOre + allocatedInOre + settlementInOre;
  return {
    expenses: activeExpenses,
    incomes: activeIncomes,
    incomeInOre,
    directInOre,
    allocatedInOre,
    settlementInOre,
    totalInOre,
    savingsInOre,
    remainingInOre:
      incomeInOre === null ? null : incomeInOre - totalInOre - savingsInOre,
  };
}

export type MonthlyExpense = ReturnType<
  typeof monthlySummary
>["expenses"][number];

export function monthlyExpenseAmount(period: string, expense: BudgetExpense) {
  if (!isActiveInPeriod(period, expense)) return 0;
  if (expense.destination !== "settlement") return monthlyEquivalent(expense);
  if (!expense.settlement || !expense.nextDueOn)
    throw new Error("Avräkningens beräkningsunderlag saknas.");
  return settlementContribution(
    period,
    expense.amountInOre,
    expense.nextDueOn,
    expense.settlement,
  );
}
