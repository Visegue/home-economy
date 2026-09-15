import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { withAuthenticatedDatabase } from "@/db/authorized";
import { households, savingsGoals } from "@/db/schema";
import {
  incomeFromDatabase,
  incomeToDatabase,
} from "@/features/income/validation";
import { savingIdSchema, savingSchema, type Saving } from "./validation";

export async function getSavings(): Promise<Saving[]> {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const rows = await transaction
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        amount: savingsGoals.monthlyContribution,
      })
      .from(savingsGoals)
      .innerJoin(households, eq(households.id, savingsGoals.householdId))
      .where(
        and(eq(households.ownerUserId, user.id), eq(savingsGoals.active, true)),
      )
      .orderBy(asc(savingsGoals.createdAt), asc(savingsGoals.id));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      amountInOre: incomeFromDatabase(row.amount)!,
    }));
  });
}

export async function saveSaving(
  input: Omit<Saving, "id">,
  id?: number,
): Promise<void> {
  const saving = savingSchema.parse(input);
  if (id !== undefined) savingIdSchema.parse(id);
  await withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select({ id: households.id })
      .from(households)
      .where(eq(households.ownerUserId, user.id))
      .limit(1);
    if (!household)
      throw new Error("Ett hushåll krävs för att spara sparandet.");
    const values = {
      name: saving.name,
      monthlyContribution: incomeToDatabase(saving.amountInOre)!,
    };
    if (id === undefined) {
      await transaction
        .insert(savingsGoals)
        .values({ ...values, householdId: household.id });
    } else {
      const updated = await transaction
        .update(savingsGoals)
        .set(values)
        .where(
          and(
            eq(savingsGoals.id, id),
            eq(savingsGoals.householdId, household.id),
            eq(savingsGoals.active, true),
          ),
        )
        .returning();
      if (!updated.length) throw new Error("Sparandet finns inte längre.");
    }
  });
}

export async function removeSaving(id: number): Promise<void> {
  savingIdSchema.parse(id);
  await withAuthenticatedDatabase(async (transaction, user) => {
    const ownedHouseholds = transaction
      .select({ id: households.id })
      .from(households)
      .where(eq(households.ownerUserId, user.id));
    const removed = await transaction
      .update(savingsGoals)
      .set({ active: false })
      .where(
        and(
          eq(savingsGoals.id, id),
          eq(savingsGoals.householdId, ownedHouseholds),
          eq(savingsGoals.active, true),
        ),
      )
      .returning();
    if (!removed.length) throw new Error("Sparandet finns inte längre.");
  });
}
