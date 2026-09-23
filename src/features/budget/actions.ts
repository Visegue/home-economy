"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logServerError } from "@/lib/server-error-log";
import {
  addExpense,
  addPerson,
  updatePerson,
  removePerson,
  removeExpense,
  removeIncome,
  saveIncome,
} from "./data";
import { expenseSchema, incomeSchema, periodSchema } from "./model";

export interface FormState {
  error?: string;
  success?: string;
}
async function mutate(
  operation: () => Promise<FormState | void>,
): Promise<FormState> {
  try {
    const result = await operation();
    revalidatePath("/");
    revalidatePath("/salary");
    revalidatePath("/settings");
    return result ?? { success: "Sparat." };
  } catch (error) {
    unstable_rethrow(error);
    logServerError({
      error,
      event: "budget.write.failed",
      reference: randomUUID(),
    });
    return { error: "Det gick inte att spara. Försök igen." };
  }
}
export async function addExpenseAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const id = data.get("id");
  const parsedId = z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .safeParse(id || undefined);
  if (!parsedId.success) return { error: "Utgiften kunde inte hittas." };
  const parsed = expenseSchema.safeParse({
    name: data.get("name"),
    amount: data.get("amount"),
    period: data.get("period"),
    type: data.get("type"),
    months: data.get("months"),
    nextDueOn: data.get("nextDueOn") ?? "",
    ownerIds: data.getAll("ownerIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return mutate(async () => {
    await addExpense(parsed.data, parsedId.data);
    return { success: "Utgiften har sparats." };
  });
}
export async function saveIncomeAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const parsed = incomeSchema.safeParse({
    id: data.get("id") || undefined,
    name: data.get("name"),
    amount: data.get("amount"),
    startsOn: data.get("startsOn"),
    endsOn: data.get("endsOn") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return mutate(async () => {
    await saveIncome(parsed.data);
    return { success: "Inkomsten har sparats." };
  });
}
export async function removeIncomeAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const parsed = z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .safeParse(data.get("id"));
  if (!parsed.success) return { error: "Inkomsten kunde inte hittas." };
  return mutate(() => removeIncome(parsed.data));
}
const personIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export async function savePersonAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const id = personIdSchema.optional().safeParse(data.get("id") || undefined);
  if (!id.success) return { error: "Medlemmen kunde inte hittas." };
  const parsed = z
    .string()
    .trim()
    .min(1, "Ange medlemmens namn.")
    .max(120, "Namnet får vara högst 120 tecken.")
    .safeParse(data.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return mutate(async () =>
    (await (id.data
      ? updatePerson(id.data, parsed.data)
      : addPerson(parsed.data)))
      ? { success: "Medlemmen har sparats." }
      : { error: "Det finns redan en medlem med det namnet." },
  );
}

export async function removePersonAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const id = personIdSchema.safeParse(data.get("id"));
  if (!id.success) return { error: "Medlemmen kunde inte hittas." };
  return mutate(async () => {
    await removePerson(id.data);
    return { success: "Medlemmen har tagits bort." };
  });
}
export async function removeExpenseAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const parsed = z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .safeParse(data.get("id"));
  if (!parsed.success) return { error: "Utgiften kunde inte hittas." };
  const period = periodSchema.safeParse(data.get("period"));
  if (!period.success) return { error: "Välj en giltig månad." };
  return mutate(() => removeExpense(parsed.data, period.data));
}
