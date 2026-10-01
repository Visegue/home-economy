"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withAuthenticatedDatabase } from "@/db/authorized";
import { households } from "@/db/schema";
import { scheduledDaySchema } from "./model";
export async function saveDayDefaults(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const parsed = z
    .object({
      incomeDay: scheduledDaySchema,
      directDay: scheduledDaySchema,
      allocatedDay: scheduledDaySchema,
      replacementDay: scheduledDaySchema,
      savingDay: scheduledDaySchema,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Välj dagar mellan 1 och 31." };
  await withAuthenticatedDatabase(async (transaction, user) => {
    await transaction
      .update(households)
      .set(parsed.data)
      .where(eq(households.ownerUserId, user.id));
  });
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: "Standarddagarna har sparats." };
}
