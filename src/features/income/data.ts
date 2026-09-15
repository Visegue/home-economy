import "server-only";

import { and, eq } from "drizzle-orm";
import { withAuthenticatedDatabase } from "@/db/authorized";
import { householdMemberIncome, households } from "@/db/schema";
import { incomeFromDatabase, incomeToDatabase } from "./validation";

export async function getMonthlyNetIncome(): Promise<number | null> {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const [income] = await transaction
      .select({ amount: householdMemberIncome.monthlyNetIncome })
      .from(householdMemberIncome)
      .innerJoin(
        households,
        eq(households.id, householdMemberIncome.householdId),
      )
      .where(
        and(
          eq(households.ownerUserId, user.id),
          eq(householdMemberIncome.userId, user.id),
        ),
      )
      .limit(1);
    return incomeFromDatabase(income?.amount ?? null);
  });
}

export async function saveMonthlyNetIncome(
  amountInOre: number | null,
): Promise<void> {
  const monthlyNetIncome = incomeToDatabase(amountInOre);
  await withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select({ id: households.id })
      .from(households)
      .where(eq(households.ownerUserId, user.id))
      .limit(1);
    if (!household)
      throw new Error("Ett hushåll krävs för att spara inkomsten.");
    await transaction
      .insert(householdMemberIncome)
      .values({
        householdId: household.id,
        userId: user.id,
        monthlyNetIncome,
      })
      .onConflictDoUpdate({
        target: [
          householdMemberIncome.householdId,
          householdMemberIncome.userId,
        ],
        set: { monthlyNetIncome, updatedAt: new Date() },
      });
  });
}
