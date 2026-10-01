import "server-only";
import { memberColorForIndex } from "@/features/households/member-appearance";

import { and, asc, count, eq, inArray } from "drizzle-orm";
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
import { currentPeriod } from "./model";
import { periodDate } from "./validity";
import { writeVersion } from "@/features/periods/write";
import { storedMetadata, type WriteOptions } from "@/features/periods/model";
import { settlementForecast } from "@/domain/settlement";

async function ownedHousehold(
  transaction: AuthorizedTransaction,
  userId: string,
) {
  const [household] = await transaction
    .select()
    .from(households)
    .where(eq(households.ownerUserId, userId))
    .limit(1);
  if (!household) redirect("/onboarding");
  return household;
}

export async function getBudgetData() {
  return withAuthenticatedDatabase((transaction, user) =>
    readBudgetData(transaction, user.id),
  );
}

// Internal read used only inside an authenticated transaction.
export async function readBudgetData(
  transaction: AuthorizedTransaction,
  userId: string,
  includeInactive = false,
) {
  const household = await ownedHousehold(transaction, userId);
  const people = await transaction
    .select({
      id: householdPeople.id,
      name: householdPeople.name,
      color: householdPeople.color,
    })
    .from(householdPeople)
    .where(eq(householdPeople.householdId, household.id))
    .orderBy(asc(householdPeople.name));
  const items = await transaction
    .select()
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.householdId, household.id),
        includeInactive ? undefined : eq(recurringItems.active, true),
        inArray(recurringItems.kind, ["expense", "reserve"]),
        inArray(recurringItems.destination, [
          "direct",
          "allocated",
          "settlement",
        ]),
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
    .where(
      and(
        eq(householdIncomes.householdId, household.id),
        eq(householdIncomes.active, true),
      ),
    )
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
    ...storedMetadata(item),
    id: item.id,
    name: item.name,
    amountInOre: Math.round(item.amount * 100),
    unit: item.cadenceUnit,
    every: item.cadenceInterval,
    destination:
      item.destination === "settlement"
        ? "settlement"
        : item.destination === "allocated"
          ? "allocated"
          : "direct",
    settlement: item.settlementStartsOn
      ? {
          startsOn: item.settlementStartsOn.toISOString().slice(0, 10),
          markupAmountInOre:
            item.markupAmount === null
              ? null
              : Math.round(item.markupAmount * 100),
          markupPercent: item.markupPercent,
          inflationPercent: item.inflationPercent,
        }
      : null,
    startsOn: item.startsOn?.toISOString().slice(0, 10) ?? null,
    endsOn: item.endsOn?.toISOString().slice(0, 10) ?? null,
    nextDueOn: item.nextDueOn?.toISOString().slice(0, 10) ?? null,
    owners: ownersByItem.get(item.id) ?? [],
  }));
  const incomes: BudgetIncome[] = incomeRows.map((income) => ({
    ...storedMetadata(income),
    id: income.id,
    name: income.name,
    startsOn: income.startsOn.toISOString().slice(0, 7),
    endsOn: income.endsOn?.toISOString().slice(0, 7) ?? null,
    amountInOre: Math.round(income.amount * 100),
  }));
  return { household, people, expenses, incomes };
}

export async function addExpense(input: ExpenseInput, id?: number) {
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
    return writeVersion(
      transaction,
      household.id,
      "expense",
      { ...input, id, date: input.period },
      {
        lock: async (versionId) =>
          (
            await transaction
              .select()
              .from(recurringItems)
              .where(
                and(
                  eq(recurringItems.id, versionId),
                  eq(recurringItems.householdId, household.id),
                  eq(recurringItems.active, true),
                  inArray(recurringItems.kind, ["expense", "reserve"]),
                ),
              )
              .for("update")
          )[0],
        close: async (existing, values) => {
          await transaction
            .update(recurringItems)
            .set(values)
            .where(eq(recurringItems.id, existing.id));
        },
        save: async (existing, version, replacesWholePeriod) => {
          // Keep the planning anchor across revisions; a new payment date starts a new plan.
          const settlementStartsOn =
            input.type === "settlement"
              ? existing?.destination === "settlement" &&
                existing.nextDueOn?.toISOString().slice(0, 10) ===
                  input.nextDueOn
                ? (existing.settlementStartsOn ??
                  periodDate(input.period.slice(0, 7)))
                : periodDate(input.period.slice(0, 7))
              : null;
          if (input.type === "settlement") {
            if (!input.settlement || !settlementStartsOn)
              throw new Error("Avräkningens beräkningsunderlag saknas.");
            settlementForecast(
              input.amount,
              settlementStartsOn.toISOString().slice(0, 10),
              input.nextDueOn,
              input.settlement,
            );
          }
          const adjustments =
            input.type === "settlement" ? input.settlement : undefined;
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
            settlementStartsOn,
            markupAmount:
              adjustments?.markupAmountInOre == null
                ? null
                : adjustments.markupAmountInOre / 100,
            markupPercent: adjustments?.markupPercent ?? null,
            inflationPercent: adjustments?.inflationPercent ?? null,
            ...version,
            nextDueOn:
              input.type !== "direct"
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
              : await transaction
                  .insert(recurringItems)
                  .values(values)
                  .returning();
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
        },
      },
    );
  });
}

export async function removeExpense(
  id: number,
  period = currentPeriod(),
  options: WriteOptions = {},
) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    return writeVersion(
      transaction,
      household.id,
      "expense",
      { ...options, id, date: period, stop: true },
      {
        lock: async (versionId) =>
          (
            await transaction
              .select()
              .from(recurringItems)
              .where(
                and(
                  eq(recurringItems.id, versionId),
                  eq(recurringItems.householdId, household.id),
                  eq(recurringItems.active, true),
                  inArray(recurringItems.kind, ["expense", "reserve"]),
                ),
              )
              .for("update")
          )[0],
        close: async (existing, values) => {
          await transaction
            .update(recurringItems)
            .set(values)
            .where(eq(recurringItems.id, existing.id));
        },
        save: async () => {
          throw new Error("Invalid stop operation");
        },
      },
    );
  });
}

export async function saveIncome(input: IncomeInput) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    return writeVersion(
      transaction,
      household.id,
      "income",
      { ...input, date: input.startsOn, end: input.endsOn },
      {
        lock: async (id) =>
          (
            await transaction
              .select()
              .from(householdIncomes)
              .where(
                and(
                  eq(householdIncomes.id, id),
                  eq(householdIncomes.householdId, household.id),
                  eq(householdIncomes.active, true),
                ),
              )
              .for("update")
          )[0],
        close: async (existing, values) => {
          await transaction
            .update(householdIncomes)
            .set({ ...values, startsOn: values.startsOn ?? undefined })
            .where(eq(householdIncomes.id, existing.id));
        },
        save: async (existing, version, replace) => {
          const values = {
            ...version,
            startsOn: version.startsOn!,
            householdId: household.id,
            name: input.name,
            amount: input.amount / 100,
          };
          const [income] = replace
            ? await transaction
                .update(householdIncomes)
                .set(values)
                .where(eq(householdIncomes.id, existing!.id))
                .returning()
            : await transaction
                .insert(householdIncomes)
                .values(values)
                .returning();
          return income.id;
        },
      },
    );
  });
}

export async function removeIncome(
  id: number,
  date?: string,
  options: WriteOptions = {},
) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    return writeVersion(
      transaction,
      household.id,
      "income",
      {
        ...options,
        id,
        date: date ?? currentPeriod(),
        stop: true,
        ...(date ? {} : { mode: "correct" }),
      },
      {
        lock: async (versionId) =>
          (
            await transaction
              .select()
              .from(householdIncomes)
              .where(
                and(
                  eq(householdIncomes.id, versionId),
                  eq(householdIncomes.householdId, household.id),
                  eq(householdIncomes.active, true),
                ),
              )
              .for("update")
          )[0],
        close: async (existing, values) => {
          await transaction
            .update(householdIncomes)
            .set({ ...values, startsOn: values.startsOn ?? undefined })
            .where(eq(householdIncomes.id, existing.id));
        },
        save: async () => {
          throw new Error("Invalid stop operation");
        },
      },
    );
  });
}

export async function addPerson(name: string, color?: string) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
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

export async function updatePerson(id: number, name: string, color?: string) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
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
    const updated = await transaction
      .update(householdPeople)
      .set({ name, ...(color === undefined ? {} : { color }) })
      .where(
        and(
          eq(householdPeople.id, id),
          eq(householdPeople.householdId, household.id),
        ),
      )
      .returning();
    if (!updated.length) throw new Error("Household person not found");
    return true;
  });
}

export async function removePerson(id: number) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await ownedHousehold(transaction, user.id);
    // Owner links cascade; the expenses themselves are preserved.
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
