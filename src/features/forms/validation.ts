import type { FieldErrors } from "@home-economy/ui/form";
import {
  expenseSchema,
  incomeSchema,
  amountSchema,
} from "@/features/budget/model";
import { expenseFormValues } from "@/features/budget/form-data";
import { savingInputSchema } from "@/features/savings/validation";
import { monthlyIncomeInputSchema } from "@/features/income/validation";
import { memberSchema } from "@/features/households/members/model";
import { householdNameSchema } from "@/features/households/validation";

function feedback(
  result: {
    success: boolean;
    error?: { issues: { path: PropertyKey[]; message: string }[] };
  },
  aliases: Record<string, string> = {},
): FieldErrors {
  const errors: FieldErrors = {};
  if (!result.success)
    for (const issue of result.error?.issues ?? []) {
      const path = issue.path.map(String).join(".");
      const field = aliases[path] ?? String(issue.path[0] ?? "amount");
      errors[field] ??= issue.message;
    }
  return errors;
}
export function validateExpense(data: FormData) {
  const result = expenseSchema.safeParse(expenseFormValues(data));
  if (result.success) return {};
  // Keep specific input errors before diagnosing a forecast's date.
  const invalidBasis = result.error.issues.some(
    (issue) =>
      issue.path[0] === "amount" ||
      (issue.path[0] === "settlement" && issue.path.length > 1),
  );
  const issues = result.error.issues.filter(
    (issue) =>
      !(
        invalidBasis &&
        issue.path.length === 1 &&
        issue.path[0] === "settlement"
      ),
  );
  return feedback(
    { success: false, error: { issues } },
    {
      "settlement.markupAmountInOre": "markup",
      "settlement.markupPercent": "markup",
      "settlement.inflationPercent": "inflation",
      settlement: "nextDueOn",
    },
  );
}
export function validateIncome(data: FormData) {
  return feedback(
    incomeSchema.safeParse({
      mode: data.get("mode") ?? undefined,
      revision: data.get("revision") ?? undefined,
      scheduledDay: data.get("scheduledDay") ?? undefined,
      id: data.get("id") || undefined,
      name: data.get("name"),
      amount: data.get("amount"),
      startsOn: data.get("startsOn"),
      endsOn: data.get("endsOn") ?? "",
    }),
  );
}
export function validateSaving(data: FormData) {
  return feedback(
    savingInputSchema.safeParse({
      name: data.get("name"),
      amountInOre: data.get("amount"),
    }),
    { amountInOre: "amount" },
  );
}
export function validateOnboarding(data: FormData) {
  const name = householdNameSchema.safeParse(data.get("name"));
  const result = monthlyIncomeInputSchema.safeParse(
    data.get("monthlyNetIncome") ?? "",
  );
  return {
    ...(!name.success ? { name: name.error.issues[0]?.message } : {}),
    ...(!result.success
      ? { monthlyNetIncome: result.error.issues[0]?.message }
      : {}),
  };
}
export function validateMember(data: FormData) {
  return feedback(
    memberSchema.safeParse({
      name: data.get("name"),
      color: data.get("color") ?? undefined,
    }),
  );
}
export function validateTransfer(data: FormData) {
  const result = amountSchema.safeParse(data.get("amount"));
  if (!result.success) return { amount: result.error.issues[0]?.message };
  return data.get("kind") !== "opening" && result.data === 0
    ? { amount: "Beloppet måste vara större än noll." }
    : {};
}
