import "server-only";

import { eq } from "drizzle-orm";

import { withAuthenticatedDatabase } from "@/db/authorized";
import { householdIncomes, householdMembers, households } from "@/db/schema";
import { monthlyIncomeInOreSchema } from "@/features/income/validation";
import { currentPeriod } from "@/features/budget/model";

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
  | "insert_owner_membership"
  | "insert_initial_income";

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
  monthlyNetIncomeInOre: number | null = null,
): Promise<CurrentHousehold> {
  monthlyIncomeInOreSchema.parse(monthlyNetIncomeInOre);
  return withAuthenticatedDatabase(async (transaction, user) => {
    let stage: HouseholdCreationStage = "find_existing_household";

    try {
      const [existingHousehold] = await transaction
        .select(householdSelection)
        .from(households)
        .where(eq(households.ownerUserId, user.id))
        .limit(1);

      let household = existingHousehold;
      let created = false;

      if (!household) {
        stage = "insert_household";
        [household] = await transaction
          .insert(households)
          .values({ name, ownerUserId: user.id })
          .onConflictDoNothing({ target: households.ownerUserId })
          .returning();
        created = Boolean(household);
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

      if (created && monthlyNetIncomeInOre !== null) {
        stage = "insert_initial_income";
        await transaction
          .insert(householdIncomes)
          .values({
            householdId: household.id,
            name: "Månadsinkomst",
            amount: monthlyNetIncomeInOre / 100,
            startsOn: new Date(`${currentPeriod()}-01T00:00:00Z`),
          })
          .onConflictDoNothing();
      }

      return household;
    } catch (error) {
      throw new HouseholdCreationError(stage, error);
    }
  });
}
