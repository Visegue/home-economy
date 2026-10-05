import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  withAuthenticatedDatabase,
  type AuthorizedTransaction,
} from "@/db/authorized";
import {
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
import { PeriodWriteError, writeVersion } from "@/features/periods/write";
import { storedMetadata, type WriteOptions } from "@/features/periods/model";
import { settlementForecast } from "@/domain/settlement";

import { readOwnedHousehold } from "@/features/households/owned-household";
import {
  readHouseholdMembers,
  readExpenseOwners,
  validateExpenseOwners,
} from "@/features/households/members/data";

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
  const household = await readOwnedHousehold(transaction, userId);
  const people = await readHouseholdMembers(transaction, household.id);
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
  const ownersByItem = await readExpenseOwners(
    transaction,
    household.id,
    people,
  );
  const incomes = await readIncomes(transaction, household.id);
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
  return { household, people, expenses, incomes };
}

async function readIncomes(
  transaction: AuthorizedTransaction,
  householdId: number,
): Promise<BudgetIncome[]> {
  const incomeRows = await transaction
    .select()
    .from(householdIncomes)
    .where(
      and(
        eq(householdIncomes.householdId, householdId),
        eq(householdIncomes.active, true),
      ),
    )
    .orderBy(asc(householdIncomes.name), asc(householdIncomes.startsOn));
  return incomeRows.map((income) => ({
    ...storedMetadata(income),
    id: income.id,
    name: income.name,
    startsOn: income.startsOn.toISOString().slice(0, 7),
    endsOn: income.endsOn?.toISOString().slice(0, 7) ?? null,
    amountInOre: Math.round(income.amount * 100),
  }));
}

export async function getIncomeData() {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await readOwnedHousehold(transaction, user.id);
    const incomes = await readIncomes(transaction, household.id);
    return { household, incomes };
  });
}

export async function addExpense(input: ExpenseInput, id?: number) {
  return withAuthenticatedDatabase(async (transaction, user) => {
    const household = await readOwnedHousehold(transaction, user.id);
    const ownerIds = await validateExpenseOwners(
      transaction,
      household.id,
      input.ownerIds,
    );
    return writeVersion(
      transaction,
      household.id,
      "expense",
      { ...input, id, date: input.period },
      {
        lock: async (versionId) => {
          const [existing] = await transaction
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
            .for("update");
          if (existing && existing.destination !== input.type)
            throw new PeriodWriteError(
              "Utgiftstypen kan inte ändras. Avsluta posten och skapa en ny med den önskade typen.",
            );
          return existing;
        },
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
    const household = await readOwnedHousehold(transaction, user.id);
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
    const household = await readOwnedHousehold(transaction, user.id);
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
    const household = await readOwnedHousehold(transaction, user.id);
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
