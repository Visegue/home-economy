import "server-only";
import { and, asc, eq } from "drizzle-orm";
import {
  withAuthenticatedDatabase,
  type AuthorizedTransaction,
} from "@/db/authorized";
import {
  confirmedTransfers,
  financialItems,
  households,
  recurringItems,
  savingsGoals,
} from "@/db/schema";
import { readBudgetData } from "@/features/budget/data";
import { readSavings } from "@/features/savings/data";
import {
  monthlyExpenseAmount,
  periodSchema,
  type BudgetExpense,
} from "@/features/budget/model";
import {
  asDate,
  currentDate,
  dateOnly,
  monthEnd,
  selectMonthlyVersions,
  scheduledDate,
  versionBounds,
} from "@/features/periods/model";
import { PeriodWriteError } from "@/features/periods/write";
import {
  fundingProgress,
  transferSchema,
  transferValue,
  valueOn,
  type Transfer,
} from "./model";
import type { Saving } from "@/features/savings/validation";

function toTransfer(row: typeof confirmedTransfers.$inferSelect): Transfer {
  return {
    id: row.id,
    itemId: row.itemId,
    kind: row.kind,
    amountInOre: Math.round(row.amount * 100),
    occurredOn: dateOnly(row.occurredOn),
    attributionMonth: dateOnly(row.attributionMonth).slice(0, 7),
    note: row.note,
  };
}
export async function readTransfers(
  transaction: AuthorizedTransaction,
  householdId: number,
) {
  return (
    await transaction
      .select()
      .from(confirmedTransfers)
      .where(eq(confirmedTransfers.householdId, householdId))
      .orderBy(
        asc(confirmedTransfers.occurredOn),
        asc(confirmedTransfers.createdAt),
      )
  ).map(toTransfer);
}
export async function getFundingData(period: string) {
  periodSchema.parse(period);
  return withAuthenticatedDatabase(
    async (transaction, user) => {
      const budget = await readBudgetData(transaction, user.id, true);
      const savings = await readSavings(transaction, user.id, true);
      const transfers = await readTransfers(transaction, budget.household.id);
      const plannedExpenses = selectMonthlyVersions(period, budget.expenses);
      const plannedSavings = selectMonthlyVersions(period, savings);
      const groups = new Map<
        string,
        { source: "saving" | "expense"; versions: (Saving | BudgetExpense)[] }
      >();
      for (const [source, rows] of [
        ["expense", budget.expenses],
        ["saving", savings],
      ] as const) {
        for (const row of rows) {
          const key = row.itemId ?? `${source}-${row.id}`;
          const group = groups.get(key) ?? { source, versions: [] };
          group.versions.push(row);
          groups.set(key, group);
        }
      }
      const purposes = [...groups.values()].flatMap(({ source, versions }) => {
        if (
          source === "expense" &&
          !versions.some(
            (v) => "destination" in v && v.destination !== "direct",
          )
        )
          return [];
        versions.sort((a, b) =>
          (versionBounds(a).start ?? "").localeCompare(
            versionBounds(b).start ?? "",
          ),
        );
        const latest = versions.at(-1)!;
        const movements = latest.itemId
          ? transfers.filter((t) => t.itemId === latest.itemId)
          : [];
        const savingPlan =
          source === "saving"
            ? plannedSavings.find((p) =>
                latest.itemId
                  ? p.display.itemId === latest.itemId
                  : p.display.id === latest.id,
              )
            : undefined;
        const expensePlan =
          source === "expense"
            ? plannedExpenses.find((p) =>
                latest.itemId
                  ? p.display.itemId === latest.itemId
                  : p.display.id === latest.id,
              )
            : undefined;
        const display =
          expensePlan?.display ??
          savingPlan?.display ??
          // Inactive purposes retain their last known label, not a future rename.
          versions.findLast((v) => {
            const start = versionBounds(v).start;
            return !start || start <= monthEnd(period);
          }) ??
          versions[0]!;
        const basis = expensePlan?.basis ?? savingPlan?.basis;
        const amount = expensePlan?.basis
          ? expensePlan.basis.destination === "direct"
            ? 0
            : monthlyExpenseAmount(period, expensePlan.basis)
          : (savingPlan?.basis?.amountInOre ?? 0);
        const recordVersion =
          source === "expense"
            ? versions.findLast(
                (v) => "destination" in v && v.destination !== "direct",
              )!
            : latest;
        return [
          {
            source,
            id: recordVersion.id,
            itemId: latest.itemId ?? null,
            name: display.name,
            versions,
            transfers: movements,
            progress: fundingProgress(movements, period, amount),
            scheduledOn: basis?.scheduledDay
              ? scheduledDate(period, basis.scheduledDay)
              : null,
            valueInOre: valueOn(movements, currentDate()),
            monthEndValueInOre: valueOn(movements, monthEnd(period)),
            hasOpening: movements.some((t) => t.kind === "opening"),
          },
        ];
      });
      return { period, purposes, household: budget.household };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function confirmTransfer(input: unknown) {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success)
    throw new PeriodWriteError(
      parsed.error.issues[0]?.message ?? "Ogiltig överföring.",
    );
  const data = parsed.data;
  if (data.occurredOn > currentDate())
    throw new PeriodWriteError(
      "Bekräfta först när överföringen har utförts. Datumet får inte ligga i framtiden.",
    );
  return withAuthenticatedDatabase(async (transaction, user) => {
    const [household] = await transaction
      .select()
      .from(households)
      .where(eq(households.ownerUserId, user.id));
    if (!household) throw new PeriodWriteError("Hushållet kunde inte hittas.");
    // Lock the selected version while upgrading legacy identities. Then serialize the ledger on its stable identity.
    const row =
      data.source === "expense"
        ? (
            await transaction
              .select()
              .from(recurringItems)
              .where(
                and(
                  eq(recurringItems.id, data.versionId),
                  eq(recurringItems.householdId, household.id),
                ),
              )
              .for("update")
          )[0]
        : (
            await transaction
              .select()
              .from(savingsGoals)
              .where(
                and(
                  eq(savingsGoals.id, data.versionId),
                  eq(savingsGoals.householdId, household.id),
                ),
              )
              .for("update")
          )[0];
    if (!row || ("destination" in row && row.destination === "direct"))
      throw new PeriodWriteError(
        "Välj ett sparande, en avsatt utgift eller en avräkning.",
      );
    let itemId = row.itemId;
    if (data.itemId && itemId !== data.itemId)
      throw new PeriodWriteError("Posten har ändrats. Ladda om sidan.");
    if (!itemId) {
      const [item] = await transaction
        .insert(financialItems)
        .values({ householdId: household.id, kind: data.source })
        .returning();
      itemId = item.id;
      if (data.source === "expense")
        await transaction
          .update(recurringItems)
          .set({ itemId })
          .where(eq(recurringItems.id, row.id));
      else
        await transaction
          .update(savingsGoals)
          .set({ itemId })
          .where(eq(savingsGoals.id, row.id));
    }
    await transaction
      .select()
      .from(financialItems)
      .where(
        and(
          eq(financialItems.id, itemId),
          eq(financialItems.householdId, household.id),
        ),
      )
      .for("update");
    const existing = (
      await transaction
        .select()
        .from(confirmedTransfers)
        .where(eq(confirmedTransfers.itemId, itemId))
    ).map(toTransfer);
    const duplicate = existing.find((t) => t.id === data.id);
    if (duplicate) {
      if (
        duplicate.kind !== data.kind ||
        duplicate.amountInOre !== data.amount ||
        duplicate.occurredOn !== data.occurredOn ||
        duplicate.attributionMonth !== data.attributionMonth ||
        duplicate.note !== data.note
      )
        throw new PeriodWriteError(
          "Den här bekräftelsen har redan sparats med andra värden. Ladda om sidan.",
        );
      return { id: duplicate.id };
    }
    const opening = existing.find((t) => t.kind === "opening");
    if (data.kind === "opening" && opening)
      throw new PeriodWriteError("Ingående värde är redan registrerat.");
    if (
      (opening && data.occurredOn < opening.occurredOn) ||
      (data.kind === "opening" &&
        existing.some((t) => t.occurredOn < data.occurredOn))
    )
      throw new PeriodWriteError(
        "Ingående värde måste ligga före eller på samma datum som de registrerade överföringarna.",
      );
    const proposed: Transfer = {
      id: data.id,
      itemId,
      kind: data.kind,
      amountInOre: data.amount,
      occurredOn: data.occurredOn,
      attributionMonth: data.attributionMonth,
      note: data.note,
    };
    let balance = 0,
      negative = false;
    const byDate = new Map<string, number>();
    for (const t of [...existing, proposed])
      byDate.set(
        t.occurredOn,
        (byDate.get(t.occurredOn) ?? 0) + transferValue(t),
      );
    for (const [, amount] of [...byDate.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      balance += amount;
      if (balance < 0) negative = true;
    }
    if (negative && !data.confirmNegative)
      return {
        warning:
          "Registreringen ger ett negativt öronmärkt värde. Kontrollera om en insättning eller ett ingående värde saknas och bekräfta för att spara ändå.",
      };
    await transaction.insert(confirmedTransfers).values({
      id: data.id,
      householdId: household.id,
      itemId,
      kind: data.kind,
      amount: data.amount / 100,
      occurredOn: asDate(data.occurredOn),
      attributionMonth: asDate(data.attributionMonth),
      note: data.note,
    });
    return { id: data.id };
  });
}
