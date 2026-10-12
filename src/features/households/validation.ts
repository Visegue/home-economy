import { z } from "zod";

export const householdNameSchema = z
  .string()
  .trim()
  .min(1, "Ange ett namn på hushållet.")
  .max(120, "Namnet får vara högst 120 tecken.");
