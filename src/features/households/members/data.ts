import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  withAuthenticatedDatabase,
  type AuthorizedTransaction,
} from "@/db/authorized";
import { householdPeople, households, recurringItemOwners } from "@/db/schema";
import { readOwnedHousehold } from "../owned-household";
import { memberColorForIndex } from "./appearance";
import {
  memberIdSchema,
  memberSchema,
  type HouseholdPerson,
  type MemberInput,
} from "./model";

export async function getHouseholdMembers() {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await readOwnedHousehold(transaction, user.id);
    const people = await readHouseholdMembers(transaction, household.id);
    return { people, defaultColor: memberColorForIndex(people.length) };
  });
}

// Transaction readers let the Monthly Overview retain one authenticated snapshot.
export async function readHouseholdMembers(
  transaction: AuthorizedTransaction,
  householdId: number,
): Promise<HouseholdPerson[]> {
  return transaction
    .select({
      id: householdPeople.id,
      name: householdPeople.name,
      color: householdPeople.color,
    })
    .from(householdPeople)
    .where(eq(householdPeople.householdId, householdId))
    .orderBy(asc(householdPeople.name));
}

export async function readExpenseOwners(
  transaction: AuthorizedTransaction,
  householdId: number,
  people: HouseholdPerson[],
) {
  const links = await transaction
    .select()
    .from(recurringItemOwners)
    .where(eq(recurringItemOwners.householdId, householdId));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const ownersByItem = new Map<number, HouseholdPerson[]>();
  for (const link of links) {
    const person = peopleById.get(link.personId);
    if (person)
      ownersByItem.set(link.recurringItemId, [
        ...(ownersByItem.get(link.recurringItemId) ?? []),
        person,
      ]);
  }
  return ownersByItem;
}

export async function validateExpenseOwners(
  transaction: AuthorizedTransaction,
  householdId: number,
  ids: number[],
) {
  const ownerIds = [...new Set(z.array(memberIdSchema).parse(ids))];
  if (ownerIds.length) {
    const owners = await transaction
      .select({ id: householdPeople.id })
      .from(householdPeople)
      .where(
        and(
          eq(householdPeople.householdId, householdId),
          inArray(householdPeople.id, ownerIds),
        ),
      );
    if (owners.length !== ownerIds.length)
      throw new Error("Invalid household participants");
  }
  return ownerIds;
}

async function lockHousehold(
  transaction: AuthorizedTransaction,
  userId: string,
) {
  const household = await readOwnedHousehold(transaction, userId);
  // Serialize member defaults, duplicate checks and lifecycle writes per household.
  await transaction
    .select({ id: households.id })
    .from(households)
    .where(eq(households.id, household.id))
    .for("update");
  return household;
}

/** False means the name is already used in this household. */
export async function saveMember(input: MemberInput): Promise<boolean> {
  const { id, name, color } = memberSchema.parse(input);
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await lockHousehold(transaction, user.id);
    if (id !== undefined) {
      const [existing] = await transaction
        .select({ id: householdPeople.id })
        .from(householdPeople)
        .where(
          and(
            eq(householdPeople.id, id),
            eq(householdPeople.householdId, household.id),
          ),
        );
      if (!existing) throw new Error("Household person not found");
      const [duplicate] = await transaction
        .select({ id: householdPeople.id })
        .from(householdPeople)
        .where(
          and(
            eq(householdPeople.householdId, household.id),
            eq(householdPeople.name, name),
          ),
        );
      if (duplicate && duplicate.id !== id) return false;
      await transaction
        .update(householdPeople)
        .set({ name, ...(color === undefined ? {} : { color }) })
        .where(
          and(
            eq(householdPeople.id, id),
            eq(householdPeople.householdId, household.id),
          ),
        );
      return true;
    }

    let resolvedColor = color;
    if (resolvedColor === undefined) {
      const [members] = await transaction
        .select({ total: count() })
        .from(householdPeople)
        .where(eq(householdPeople.householdId, household.id));
      resolvedColor = memberColorForIndex(members.total);
    }
    const created = await transaction
      .insert(householdPeople)
      .values({ householdId: household.id, name, color: resolvedColor })
      .onConflictDoNothing()
      .returning();
    return created.length > 0;
  });
}

export async function removeMember(id: number): Promise<void> {
  memberIdSchema.parse(id);
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await lockHousehold(transaction, user.id);
    // Owner links cascade, including history; financial definitions are preserved.
    const removed = await transaction
      .delete(householdPeople)
      .where(
        and(
          eq(householdPeople.id, id),
          eq(householdPeople.householdId, household.id),
        ),
      )
      .returning();
    if (!removed.length) throw new Error("Household person not found");
  });
}
