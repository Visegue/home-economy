"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { logServerError } from "@/lib/server-error-log";
import { removeSaving, saveSaving } from "./data";
import { savingIdSchema, savingInputSchema } from "./validation";
import { periodSchema } from "@/features/budget/model";

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
  const period = periodSchema.safeParse(formData.get("period"));
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
    await saveSaving(parsed.data, id, period.data);
  } catch (error) {
    unstable_rethrow(error);
    logServerError({
      error,
      event: "saving.save.failed",
      reference: randomUUID(),
    });
    return { error: "Sparandet kunde inte sparas. Försök igen om en stund." };
  }
  revalidatePath("/");
  return { success: true };
}

export async function removeSavingAction(
  id: number,
  _previous: SavingState,
  formData: FormData,
): Promise<SavingState> {
  await requireSession();
  const period = periodSchema.safeParse(formData.get("period"));
  if (!period.success) return { error: "Välj en giltig månad." };
  if (!savingIdSchema.safeParse(id).success)
    return { error: "Ogiltigt sparande." };
  try {
    await removeSaving(id, period.data);
  } catch (error) {
    unstable_rethrow(error);
    logServerError({
      error,
      event: "saving.remove.failed",
      reference: randomUUID(),
    });
    return { error: "Sparandet kunde inte avslutas. Försök snart igen." };
  }
  revalidatePath("/");
  return { success: true };
}
