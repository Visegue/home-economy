import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { withAuthenticatedDatabase } from "@/db/authorized";
import { households, savingsGoals } from "@/db/schema";
import {
  incomeFromDatabase,
  incomeToDatabase,
} from "@/features/income/validation";
import { savingIdSchema, savingSchema, type Saving } from "./validation";
import { currentPeriod, periodSchema } from "@/features/budget/model";
import {
  periodDate,
  validateEffectivePeriod,
} from "@/features/budget/validity";

export async function getSavings(): Promise<Saving[]> {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const rows = await transaction
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        amount: savingsGoals.monthlyContribution,
        startsOn: savingsGoals.startsOn,
        endsOn: savingsGoals.endsOn,
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
      startsOn: row.startsOn?.toISOString().slice(0, 7) ?? null,
      endsOn: row.endsOn?.toISOString().slice(0, 7) ?? null,
    }));
  });
}

export async function saveSaving(
  input: Pick<Saving, "name" | "amountInOre">,
  id?: number,
  period = currentPeriod(),
): Promise<number> {
  const saving = savingSchema.parse(input);
  periodSchema.parse(period);
  if (id !== undefined) savingIdSchema.parse(id);
  return withAuthenticatedDatabase(async (transaction, user) => {
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
      startsOn: periodDate(period),
    };
    if (id === undefined) {
      const [created] = await transaction
        .insert(savingsGoals)
        .values({ ...values, householdId: household.id })
        .returning();
      return created.id;
    } else {
      const [existing] = await transaction
        .select()
        .from(savingsGoals)
        .where(
          and(
            eq(savingsGoals.id, id),
            eq(savingsGoals.householdId, household.id),
            eq(savingsGoals.active, true),
          ),
        )
        .for("update");
      if (!existing) throw new Error("Sparandet finns inte längre.");
      const validity = validateEffectivePeriod(period, existing);
      if (validity.replacesWholePeriod) {
        await transaction
          .update(savingsGoals)
          .set(values)
          .where(eq(savingsGoals.id, id));
        return id;
      }
      await transaction
        .update(savingsGoals)
        .set({ endsOn: validity.previousEndsOn })
        .where(eq(savingsGoals.id, id));
      const [created] = await transaction
        .insert(savingsGoals)
        .values({
          ...values,
          householdId: household.id,
          endsOn: existing.endsOn,
          accountId: existing.accountId,
          targetAmount: existing.targetAmount,
          targetDate: existing.targetDate,
          notes: existing.notes,
        })
        .returning();
      return created.id;
    }
  });
}

export async function removeSaving(
  id: number,
  period = currentPeriod(),
): Promise<void> {
  savingIdSchema.parse(id);
  periodSchema.parse(period);
  await withAuthenticatedDatabase(async (transaction, user) => {
    const ownedHouseholds = transaction
      .select({ id: households.id })
      .from(households)
      .where(eq(households.ownerUserId, user.id));
    const [existing] = await transaction
      .select()
      .from(savingsGoals)
      .where(
        and(
          eq(savingsGoals.id, id),
          eq(savingsGoals.householdId, ownedHouseholds),
          eq(savingsGoals.active, true),
        ),
      )
      .for("update");
    if (!existing) throw new Error("Sparandet finns inte längre.");
    const validity = validateEffectivePeriod(period, existing);
    await transaction
      .update(savingsGoals)
      .set(
        validity.replacesWholePeriod
          ? { active: false }
          : { endsOn: validity.previousEndsOn },
      )
      .where(eq(savingsGoals.id, id));
  });
}
