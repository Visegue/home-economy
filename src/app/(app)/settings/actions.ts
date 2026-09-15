"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { logServerError } from "@/lib/server-error-log";
import { saveMonthlyNetIncome } from "@/features/income/data";
import { monthlyIncomeInputSchema } from "@/features/income/validation";

export interface IncomeState {
  incomeError?: string;
  error?: string;
  savedValue?: string;
}

export async function saveIncomeAction(
  _previous: IncomeState,
  formData: FormData,
): Promise<IncomeState> {
  await requireSession();
  const value = formData.get("monthlyNetIncome");
  const income = monthlyIncomeInputSchema.safeParse(value);
  if (!income.success) return { incomeError: income.error.issues[0]?.message };
  try {
    await saveMonthlyNetIncome(income.data);
  } catch (error) {
    unstable_rethrow(error);
    logServerError({
      error,
      event: "income.save.failed",
      reference: randomUUID(),
    });
    return { error: "Inkomsten kunde inte sparas. Försök igen om en stund." };
  }
  revalidatePath("/", "layout");
  return { savedValue: String(value) };
}
