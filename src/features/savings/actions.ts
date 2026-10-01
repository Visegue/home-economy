"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { logServerError } from "@/lib/server-error-log";
import { removeSaving, saveSaving } from "./data";
import { savingIdSchema, savingInputSchema } from "./validation";
import {
  effectiveDateSchema,
  writeOptionsSchema,
} from "@/features/periods/model";
import { PeriodWriteError } from "@/features/periods/write";

export interface SavingState {
  error?: string;
  nameError?: string;
  amountError?: string;
  success?: boolean;
}

export async function saveSavingAction(
  id: number | undefined,
  _previous: SavingState,
  formData: FormData,
): Promise<SavingState> {
  await requireSession();
  const period = effectiveDateSchema.safeParse(formData.get("period"));
  if (!period.success) return { error: "Välj en giltig månad." };
  if (id !== undefined && !savingIdSchema.safeParse(id).success)
    return { error: "Ogiltigt sparande." };
  const parsed = savingInputSchema.safeParse({
    name: formData.get("name"),
    amountInOre: formData.get("amount"),
  });
  if (!parsed.success) {
    return {
      nameError: parsed.error.issues.find((issue) => issue.path[0] === "name")
        ?.message,
      amountError: parsed.error.issues.find(
        (issue) => issue.path[0] === "amountInOre",
      )?.message,
    };
  }
  try {
    const options = writeOptionsSchema.safeParse({
      mode: formData.get("mode") ?? undefined,
      revision: formData.get("revision") ?? undefined,
      scheduledDay: formData.get("scheduledDay") ?? undefined,
    });
    if (!options.success)
      return { error: "Välj planerad dag mellan 1 och 31." };
    await saveSaving(parsed.data, id, period.data, options.data);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof PeriodWriteError) return { error: error.message };
    logServerError({
      error,
      event: "saving.save.failed",
      reference: randomUUID(),
    });
    return { error: "Sparandet kunde inte sparas. Försök igen om en stund." };
  }
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/transfers");
  return { success: true };
}

export async function removeSavingAction(
  id: number,
  _previous: SavingState,
  formData: FormData,
): Promise<SavingState> {
  await requireSession();
  const period = effectiveDateSchema.safeParse(formData.get("period"));
  if (!period.success) return { error: "Välj en giltig månad." };
  if (!savingIdSchema.safeParse(id).success)
    return { error: "Ogiltigt sparande." };
  try {
    const options = writeOptionsSchema.safeParse({
      revision: formData.get("revision") ?? undefined,
    });
    if (!options.success) return { error: "Ladda om sidan och försök igen." };
    await removeSaving(id, period.data, options.data);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof PeriodWriteError) return { error: error.message };
    logServerError({
      error,
      event: "saving.remove.failed",
      reference: randomUUID(),
    });
    return { error: "Sparandet kunde inte avslutas. Försök snart igen." };
  }
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/transfers");
  return { success: true };
}
