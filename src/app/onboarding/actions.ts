"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createPersonalHousehold } from "@/features/households/data";

const householdNameSchema = z
  .string()
  .trim()
  .min(1, "Ange ett namn på hushållet.")
  .max(120, "Namnet får vara högst 120 tecken.");

export interface OnboardingState {
  error?: string;
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
    return {
      error: "Hushållet kunde inte skapas just nu. Försök igen om en stund.",
    };
  }

  redirect("/");
}
