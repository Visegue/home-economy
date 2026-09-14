"use server";

import { randomUUID } from "node:crypto";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createPersonalHousehold } from "@/features/households/data";
import { logServerError } from "@/lib/server-error-log";

const householdNameSchema = z
  .string()
  .trim()
  .min(1, "Ange ett namn på hushållet.")
  .max(120, "Namnet får vara högst 120 tecken.");

export interface OnboardingState {
  error?: string;
  errorReference?: string;
}

export async function createHouseholdAction(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsedName = householdNameSchema.safeParse(formData.get("name"));

  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message };
  }

  try {
    await createPersonalHousehold(parsedName.data);
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
