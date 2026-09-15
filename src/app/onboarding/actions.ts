"use server";

import { randomUUID } from "node:crypto";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createPersonalHousehold } from "@/features/households/data";
import { logServerError } from "@/lib/server-error-log";
import { monthlyIncomeInputSchema } from "@/features/income/validation";
import { requireSession } from "@/lib/auth/session";

const householdNameSchema = z
  .string()
  .trim()
  .min(1, "Ange ett namn på hushållet.")
  .max(120, "Namnet får vara högst 120 tecken.");

export interface OnboardingState {
  error?: string;
  errorReference?: string;
  incomeError?: string;
}

export async function createHouseholdAction(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  await requireSession();
  const parsedName = householdNameSchema.safeParse(formData.get("name"));

  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message };
  }

  const income = monthlyIncomeInputSchema.safeParse(
    formData.get("monthlyNetIncome") ?? "",
  );
  if (!income.success) return { incomeError: income.error.issues[0]?.message };

  try {
    await createPersonalHousehold(parsedName.data, income.data);
  } catch (error) {
    unstable_rethrow(error);
    const errorReference = randomUUID();
    logServerError({
      error,
      event: "household.create.failed",
      reference: errorReference,
    });
    return {
      error: "Hushållet kunde inte skapas just nu. Försök igen om en stund.",
      errorReference,
    };
  }

  redirect("/");
}
