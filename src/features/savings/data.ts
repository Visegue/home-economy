import "server-only";
import { and, asc, eq } from "drizzle-orm";
import {
  withAuthenticatedDatabase,
  type AuthorizedTransaction,
} from "@/db/authorized";
import { households, savingsGoals } from "@/db/schema";
import {
  incomeFromDatabase,
  incomeToDatabase,
} from "@/features/income/validation";
import { savingIdSchema, savingSchema, type Saving } from "./validation";
import { currentPeriod } from "@/features/budget/model";
import { storedMetadata, type WriteOptions } from "@/features/periods/model";
import { writeVersion, type VersionAdapter } from "@/features/periods/write";

export async function getSavings(): Promise<Saving[]> {
  return withAuthenticatedDatabase((transaction, user) =>
    readSavings(transaction, user.id),
  );
}
export async function readSavings(
  transaction: AuthorizedTransaction,
  userId: string,
  includeInactive = false,
): Promise<Saving[]> {
  const rows = await transaction
    .select({ saving: savingsGoals })
    .from(savingsGoals)
    .innerJoin(households, eq(households.id, savingsGoals.householdId))
    .where(
      and(
        eq(households.ownerUserId, userId),
        includeInactive ? undefined : eq(savingsGoals.active, true),
      ),
    )
    .orderBy(asc(savingsGoals.createdAt), asc(savingsGoals.id));
  return rows.map(({ saving: row }) => ({
    ...storedMetadata(row),
    id: row.id,
    name: row.name,
    amountInOre: incomeFromDatabase(row.monthlyContribution)!,
    startsOn: row.startsOn?.toISOString().slice(0, 7) ?? null,
    endsOn: row.endsOn?.toISOString().slice(0, 7) ?? null,
  }));
}
function savingAdapter(
  transaction: AuthorizedTransaction,
  householdId: number,
  input?: Pick<Saving, "name" | "amountInOre">,
): VersionAdapter<typeof savingsGoals.$inferSelect> {
  return {
    lock: async (id) =>
      (
        await transaction
          .select()
          .from(savingsGoals)
          .where(
            and(
              eq(savingsGoals.id, id),
              eq(savingsGoals.householdId, householdId),
              eq(savingsGoals.active, true),
            ),
          )
          .for("update")
      )[0],
    close: async (existing, values) => {
      await transaction
        .update(savingsGoals)
        .set(values)
        .where(eq(savingsGoals.id, existing.id));
    },
    save: async (existing, version, replace) => {
      if (!input) throw new Error("Invalid saving operation");
      const values = {
        ...version,
        householdId,
        name: input.name,
        monthlyContribution: incomeToDatabase(input.amountInOre)!,
        accountId: existing?.accountId,
        targetAmount: existing?.targetAmount,
        targetDate: existing?.targetDate,
        notes: existing?.notes,
      };
      const [saved] = replace
        ? await transaction
            .update(savingsGoals)
            .set(values)
            .where(eq(savingsGoals.id, existing!.id))
            .returning()
        : await transaction.insert(savingsGoals).values(values).returning();
      return saved.id;
    },
  };
}
export async function saveSaving(
  input: Pick<Saving, "name" | "amountInOre">,
  id?: number,
  period = currentPeriod(),
  options: WriteOptions = {},
): Promise<number> {
  const saving = savingSchema.parse(input);
  if (id !== undefined) savingIdSchema.parse(id);
  return withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select()
      .from(households)
      .where(eq(households.ownerUserId, user.id));
    if (!household)
      throw new Error("Ett hushåll krävs för att spara sparandet.");
    return writeVersion(
      transaction,
      household.id,
      "saving",
      { ...options, id, date: period },
      savingAdapter(transaction, household.id, saving),
    );
  });
}
export async function removeSaving(
  id: number,
  period = currentPeriod(),
  options: WriteOptions = {},
): Promise<void> {
  savingIdSchema.parse(id);
  await withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select()
      .from(households)
      .where(eq(households.ownerUserId, user.id));
    if (!household) throw new Error("Sparandet finns inte längre.");
    await writeVersion(
      transaction,
      household.id,
      "saving",
      { ...options, id, date: period, stop: true },
      savingAdapter(transaction, household.id),
    );
  });
}
