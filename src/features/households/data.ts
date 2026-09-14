import "server-only";

import { eq } from "drizzle-orm";

import { withAuthenticatedDatabase } from "@/db/authorized";
import { householdMembers, households } from "@/db/schema";

export interface CurrentHousehold {
  id: number;
  name: string;
  currency: string;
}

type HouseholdCreationStage =
  | "find_existing_household"
  | "insert_household"
  | "refetch_household"
  | "resolve_household"
  | "prepare_owner_membership"
  | "insert_owner_membership";

class HouseholdCreationError extends Error {
  readonly stage: HouseholdCreationStage;

  constructor(stage: HouseholdCreationStage, cause: unknown) {
    super("Household creation failed", { cause });
    this.name = "HouseholdCreationError";
    this.stage = stage;
  }
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
    let stage: HouseholdCreationStage = "find_existing_household";

    try {
      const [existingHousehold] = await transaction
        .select(householdSelection)
        .from(households)
        .where(eq(households.ownerUserId, user.id))
        .limit(1);

      let household = existingHousehold;

      if (!household) {
        stage = "insert_household";
        [household] = await transaction
          .insert(households)
          .values({ name, ownerUserId: user.id })
          .onConflictDoNothing({ target: households.ownerUserId })
          .returning();
      }

      if (!household) {
        stage = "refetch_household";
        [household] = await transaction
          .select(householdSelection)
          .from(households)
          .where(eq(households.ownerUserId, user.id))
          .limit(1);
      }

      if (!household) {
        stage = "resolve_household";
        throw new Error("Det personliga hushållet kunde inte hämtas.");
      }

      stage = "prepare_owner_membership";
      const displayName = user.name.trim().slice(0, 120) || null;

      stage = "insert_owner_membership";
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
    } catch (error) {
      throw new HouseholdCreationError(stage, error);
    }
  });
}
