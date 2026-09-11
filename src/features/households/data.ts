import "server-only";

import { eq } from "drizzle-orm";

import { withAuthenticatedDatabase } from "@/db/authorized";
import { householdMembers, households } from "@/db/schema";

export interface CurrentHousehold {
  id: number;
  name: string;
  currency: string;
}

const householdSelection = {
  id: households.id,
  name: households.name,
  currency: households.currency,
};

export async function getCurrentHousehold(): Promise<CurrentHousehold | null> {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select(householdSelection)
      .from(households)
      .where(eq(households.ownerUserId, user.id))
      .limit(1);

    return household ?? null;
  });
}

export async function createPersonalHousehold(
  name: string,
): Promise<CurrentHousehold> {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const [existingHousehold] = await transaction
      .select(householdSelection)
      .from(households)
      .where(eq(households.ownerUserId, user.id))
      .limit(1);

    let household = existingHousehold;

    if (!household) {
      [household] = await transaction
        .insert(households)
        .values({ name, ownerUserId: user.id })
        .onConflictDoNothing({ target: households.ownerUserId })
        .returning();
    }

    if (!household) {
      [household] = await transaction
        .select(householdSelection)
        .from(households)
        .where(eq(households.ownerUserId, user.id))
        .limit(1);
    }

    if (!household) {
      throw new Error("Det personliga hushållet kunde inte hämtas.");
    }

    const displayName = user.name.trim().slice(0, 120) || null;

    await transaction
      .insert(householdMembers)
      .values({
        householdId: household.id,
        userId: user.id,
        role: "owner",
        displayName,
      })
      .onConflictDoNothing();

    return household;
  });
}
