import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  withAuthenticatedDatabase,
  type AuthorizedTransaction,
} from "@/db/authorized";
import {
  householdPeople,
  households,
  householdIncomes,
  recurringItemOwners,
  recurringItems,
} from "@/db/schema";
import type {
  BudgetExpense,
  BudgetIncome,
  ExpenseInput,
  IncomeInput,
} from "./model";
import { currentPeriod, periodSchema } from "./model";
import { validateEffectivePeriod, periodDate } from "./validity";

async function ownedHousehold(
  transaction: AuthorizedTransaction,
  userId: string,
) {
  const [household] = await transaction
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(eq(households.ownerUserId, userId))
    .limit(1);
  if (!household) redirect("/onboarding");
  return household;
}

export async function getBudgetData() {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    const people = await transaction
      .select({ id: householdPeople.id, name: householdPeople.name })
      .from(householdPeople)
      .where(eq(householdPeople.householdId, household.id))
      .orderBy(asc(householdPeople.name));
    const items = await transaction
      .select()
      .from(recurringItems)
      .where(
        and(
          eq(recurringItems.householdId, household.id),
          eq(recurringItems.active, true),
          inArray(recurringItems.kind, ["expense", "reserve"]),
          inArray(recurringItems.destination, ["direct", "allocated"]),
        ),
      )
      .orderBy(asc(recurringItems.name));
    const owners = await transaction
      .select()
      .from(recurringItemOwners)
      .where(eq(recurringItemOwners.householdId, household.id));
    const incomeRows = await transaction
      .select()
      .from(householdIncomes)
      .where(eq(householdIncomes.householdId, household.id))
      .orderBy(asc(householdIncomes.name), asc(householdIncomes.startsOn));
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const ownersByItem = new Map<number, typeof people>();
    for (const owner of owners) {
      const person = peopleById.get(owner.personId);
      if (person)
        ownersByItem.set(owner.recurringItemId, [
          ...(ownersByItem.get(owner.recurringItemId) ?? []),
          person,
        ]);
    }
    const expenses: BudgetExpense[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      amountInOre: Math.round(item.amount * 100),
      unit: item.cadenceUnit,
      every: item.cadenceInterval,
      destination: item.destination === "allocated" ? "allocated" : "direct",
      startsOn: item.startsOn?.toISOString().slice(0, 10) ?? null,
      endsOn: item.endsOn?.toISOString().slice(0, 10) ?? null,
      nextDueOn: item.nextDueOn?.toISOString().slice(0, 10) ?? null,
      owners: ownersByItem.get(item.id) ?? [],
    }));
    const incomes: BudgetIncome[] = incomeRows.map((income) => ({
      id: income.id,
      name: income.name,
      startsOn: income.startsOn.toISOString().slice(0, 7),
      endsOn: income.endsOn?.toISOString().slice(0, 7) ?? null,
      amountInOre: Math.round(income.amount * 100),
    }));
    return { household, people, expenses, incomes };
  });
}

export async function addExpense(input: ExpenseInput, id?: number) {
  periodSchema.parse(input.period);
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    const ownerIds = [...new Set(input.ownerIds)];
    if (ownerIds.length) {
      const owners = await transaction
        .select({ id: householdPeople.id })
        .from(householdPeople)
        .where(
          and(
            eq(householdPeople.householdId, household.id),
            inArray(householdPeople.id, ownerIds),
          ),
        );
      if (owners.length !== ownerIds.length)
        throw new Error("Invalid household participants");
    }
    let existing: typeof recurringItems.$inferSelect | undefined;
    let replacesWholePeriod = false;
    if (id !== undefined) {
      [existing] = await transaction
        .select()
        .from(recurringItems)
        .where(
          and(
            eq(recurringItems.id, id),
            eq(recurringItems.householdId, household.id),
            eq(recurringItems.active, true),
            inArray(recurringItems.kind, ["expense", "reserve"]),
          ),
        )
        .for("update");
      if (!existing) throw new Error("Utgiften finns inte längre.");
      const validity = validateEffectivePeriod(input.period, existing);
      replacesWholePeriod = validity.replacesWholePeriod;
      if (!replacesWholePeriod) {
        await transaction
          .update(recurringItems)
          .set({ endsOn: validity.previousEndsOn })
          .where(eq(recurringItems.id, existing.id));
      }
    }
    const values = {
      householdId: household.id,
      name: input.name,
      kind: existing?.kind ?? ("expense" as const),
      categoryId: existing?.categoryId,
      notes: existing?.notes,
      amount: input.amount / 100,
      cadenceUnit: "month" as const,
      cadenceInterval: input.type === "allocated" ? input.months : 1,
      destination: input.type,
      startsOn: periodDate(input.period),
      endsOn: existing?.endsOn ?? null,
      nextDueOn:
        input.type === "allocated"
          ? new Date(`${input.nextDueOn}T00:00:00Z`)
          : null,
    };
    const [expense] =
      existing && replacesWholePeriod
        ? await transaction
            .update(recurringItems)
            .set(values)
            .where(eq(recurringItems.id, existing.id))
            .returning()
        : await transaction.insert(recurringItems).values(values).returning();
    if (existing && replacesWholePeriod) {
      await transaction
        .delete(recurringItemOwners)
        .where(eq(recurringItemOwners.recurringItemId, existing.id));
    }
    if (ownerIds.length)
      await transaction.insert(recurringItemOwners).values(
        ownerIds.map((personId) => ({
          householdId: household.id,
          recurringItemId: expense.id,
          personId,
        })),
      );
    return expense.id;
  });
}

export async function removeExpense(id: number, period = currentPeriod()) {
  periodSchema.parse(period);
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    const [existing] = await transaction
      .select()
      .from(recurringItems)
      .where(
        and(
          eq(recurringItems.id, id),
          eq(recurringItems.householdId, household.id),
          eq(recurringItems.active, true),
          inArray(recurringItems.kind, ["expense", "reserve"]),
        ),
      )
      .for("update");
    if (!existing) return;
    const validity = validateEffectivePeriod(period, existing);
    await transaction
      .update(recurringItems)
      .set(
        validity.replacesWholePeriod
          ? { active: false }
          : { endsOn: validity.previousEndsOn },
      )
      .where(eq(recurringItems.id, id));
  });
}

export async function saveIncome(input: IncomeInput) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    const values = {
      name: input.name,
      amount: input.amount / 100,
      startsOn: new Date(`${input.startsOn}-01T00:00:00Z`),
      endsOn: input.endsOn ? new Date(`${input.endsOn}-01T00:00:00Z`) : null,
    };
    if (input.id) {
      const updated = await transaction
        .update(householdIncomes)
        .set(values)
        .where(
          and(
            eq(householdIncomes.id, input.id),
            eq(householdIncomes.householdId, household.id),
          ),
        )
        .returning();
      if (!updated.length) throw new Error("Income not found in household");
      return updated[0].id;
    }
    const [income] = await transaction
      .insert(householdIncomes)
      .values({ ...values, householdId: household.id })
      .returning();
    return income.id;
  });
}

export async function removeIncome(id: number) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    await transaction
      .delete(householdIncomes)
      .where(
        and(
          eq(householdIncomes.id, id),
          eq(householdIncomes.householdId, household.id),
        ),
      );
  });
}

export async function addPerson(name: string) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    const created = await transaction
      .insert(householdPeople)
      .values({ householdId: household.id, name })
      .onConflictDoNothing()
      .returning();
    return created.length > 0;
  });
}
