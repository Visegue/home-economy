"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logServerError } from "@/lib/server-error-log";
import {
  effectiveDateSchema,
  writeOptionsSchema,
} from "@/features/periods/model";
import { PeriodWriteError } from "@/features/periods/write";
import {
  addExpense,
  addPerson,
  updatePerson,
  removePerson,
  removeExpense,
  removeIncome,
  saveIncome,
} from "./data";
import { expenseSchema, incomeSchema, personSchema } from "./model";

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
    revalidatePath("/history");
    revalidatePath("/transfers");
    return result ?? { success: "Sparat." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof PeriodWriteError) return { error: error.message };
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
    mode: data.get("mode") ?? undefined,
    revision: data.get("revision") ?? undefined,
    scheduledDay: data.get("scheduledDay") ?? undefined,
    name: data.get("name"),
    amount: data.get("amount"),
    period: data.get("period"),
    type: data.get("type"),
    months: data.get("months"),
    nextDueOn: data.get("nextDueOn") ?? "",
    ownerIds: data.getAll("ownerIds"),
    settlement:
      data.get("type") === "settlement"
        ? {
            markupAmountInOre:
              data.get("markupEnabled") === "on" &&
              data.get("markupType") === "amount"
                ? data.get("markup")
                : null,
            markupPercent:
              data.get("markupEnabled") === "on" &&
              data.get("markupType") === "percent"
                ? data.get("markup")
                : null,
            inflationPercent:
              data.get("inflationEnabled") === "on"
                ? data.get("inflation")
                : null,
          }
        : undefined,
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
    mode: data.get("mode") ?? undefined,
    revision: data.get("revision") ?? undefined,
    scheduledDay: data.get("scheduledDay") ?? undefined,
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
  const date = effectiveDateSchema.safeParse(data.get("period"));
  const options = writeOptionsSchema.safeParse({
    revision: data.get("revision") ?? undefined,
  });
  if (!date.success || !options.success)
    return { error: "Välj ett giltigt avslutsdatum." };
  return mutate(async () => {
    await removeIncome(parsed.data, date.data, options.data);
  });
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
  const parsed = personSchema.safeParse({
    name: data.get("name"),
    color: data.get("color") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return mutate(async () =>
    (await (id.data
      ? updatePerson(id.data, parsed.data.name, parsed.data.color)
      : addPerson(parsed.data.name, parsed.data.color)))
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
  const period = effectiveDateSchema.safeParse(data.get("period"));
  if (!period.success) return { error: "Välj en giltig månad." };
  const options = writeOptionsSchema.safeParse({
    revision: data.get("revision") ?? undefined,
  });
  if (!options.success) return { error: "Ladda om sidan och försök igen." };
  return mutate(async () => {
    await removeExpense(parsed.data, period.data, options.data);
  });
}
