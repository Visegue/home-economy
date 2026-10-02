import { z } from "zod";

export interface HouseholdPerson {
  id: number;
  name: string;
  color: string;
}

export const memberIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const memberSchema = z.object({
  id: memberIdSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Ange medlemmens namn.")
    .max(120, "Namnet får vara högst 120 tecken."),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Välj en giltig färg.")
    .transform((color) => color.toLowerCase())
    .optional(),
});

export type MemberInput = z.infer<typeof memberSchema>;
