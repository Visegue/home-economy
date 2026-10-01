import "server-only";
import {
  financialItems,
  recurringItems,
  householdIncomes,
  savingsGoals,
} from "@/db/schema";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { AuthorizedTransaction } from "@/db/authorized";
import {
  asDate,
  dateOnly,
  dayBefore,
  firstDate,
  monthEnd,
  writeOptionsSchema,
  type WriteOptions,
} from "./model";

export class PeriodWriteError extends Error {}
export interface StoredVersion {
  id: number;
  startsOn: Date | null;
  endsOn: Date | null;
  effectiveFrom: Date | null;
  effectiveThrough: Date | null;
  itemId: string | null;
  scheduledDay: number | null;
  revision: number;
}
export interface VersionValues {
  itemId: string;
  startsOn: Date | null;
  endsOn: Date | null;
  effectiveFrom: Date | null;
  effectiveThrough: Date | null;
  scheduledDay: number | null;
  revision: number;
}
export interface VersionAdapter<T extends StoredVersion> {
  lock(id: number): Promise<T | undefined>;
  close(
    existing: T,
    values: Partial<VersionValues> & { active?: boolean },
  ): Promise<void>;
  save(
    existing: T | undefined,
    values: VersionValues,
    replace: boolean,
  ): Promise<number>;
}

/** Owns lock/validate/split/write ordering within the caller's authenticated transaction. */
export async function writeVersion<T extends StoredVersion>(
  transaction: AuthorizedTransaction,
  householdId: number,
  kind: "expense" | "income" | "saving",
  request: WriteOptions & {
    id?: number;
    date: string;
    end?: string | null;
    stop?: boolean;
  },
  adapter: VersionAdapter<T>,
) {
  writeOptionsSchema.parse(request);
  const requestedDate = firstDate(request.date);
  const existing =
    request.id === undefined ? undefined : await adapter.lock(request.id);
  if (request.id !== undefined && !existing) {
    if (request.stop && kind !== "saving") return request.id;
    throw new PeriodWriteError(
      kind === "saving"
        ? "Sparandet finns inte längre."
        : kind === "expense"
          ? "Utgiften finns inte längre."
          : "Inkomsten finns inte längre.",
    );
  }
  if (
    existing &&
    request.revision !== undefined &&
    request.revision !== existing.revision
  )
    throw new PeriodWriteError(
      "Posten har ändrats. Ladda om sidan innan du sparar.",
    );
  const start = existing?.effectiveFrom
    ? dateOnly(existing.effectiveFrom)
    : existing?.startsOn
      ? dateOnly(existing.startsOn)
      : null;
  const end = existing?.effectiveThrough
    ? dateOnly(existing.effectiveThrough)
    : existing?.endsOn
      ? monthEnd(dateOnly(existing.endsOn))
      : null;
  const date = request.mode === "correct" && existing ? start : requestedDate;
  let futureStart: string | null = null;
  if (existing?.itemId) {
    // Serialize changes to the same purpose, including edits of different versions.
    await transaction
      .select({ id: financialItems.id })
      .from(financialItems)
      .where(
        and(
          eq(financialItems.id, existing.itemId),
          eq(financialItems.householdId, householdId),
        ),
      )
      .for("update");
    const table =
      kind === "expense"
        ? recurringItems
        : kind === "income"
          ? householdIncomes
          : savingsGoals;
    const effectiveStart = sql<Date>`coalesce(${table.effectiveFrom}, ${table.startsOn})`;
    const [next] = await transaction
      .select({ start: effectiveStart })
      .from(table)
      .where(
        and(
          eq(table.householdId, householdId),
          eq(table.itemId, existing.itemId),
          eq(table.active, true),
          gt(effectiveStart, start ?? "0001-01-01"),
        ),
      )
      .orderBy(asc(effectiveStart))
      .limit(1);
    if (next)
      futureStart =
        typeof next.start === "string" ? next.start : dateOnly(next.start);
  }
  if (
    existing &&
    request.mode !== "correct" &&
    ((start && requestedDate < start) || (end && requestedDate > end))
  )
    throw new PeriodWriteError(
      "Ändringen måste ligga inom postens giltighetsperiod. Ladda om sidan.",
    );
  const replaces =
    !!existing && (request.mode === "correct" || requestedDate === start);
  if (request.stop && existing) {
    await adapter.close(
      existing,
      replaces
        ? { active: false, revision: existing.revision + 1 }
        : {
            effectiveThrough: asDate(dayBefore(requestedDate)),
            endsOn: asDate(dayBefore(requestedDate).slice(0, 7)),
            revision: existing.revision + 1,
          },
    );
    return existing.id;
  }
  if (
    existing &&
    request.mode !== "correct" &&
    requestedDate.slice(8) !== "01" &&
    request.scheduledDay === undefined &&
    existing.scheduledDay === null
  )
    throw new PeriodWriteError(
      "Välj planerad dag innan du ändrar mitt i en månad.",
    );
  let through =
    request.end === undefined
      ? end
      : request.end === null
        ? null
        : request.end.length === 7
          ? monthEnd(request.end)
          : firstDate(request.end);
  // An edit to an earlier version cannot consume a later version's interval.
  const futureBoundary = futureStart ? dayBefore(futureStart) : null;
  if (futureBoundary && (!through || through > futureBoundary))
    through = futureBoundary;
  if (through && date && through < date)
    throw new PeriodWriteError("Slutdatum får inte vara före startdatum.");
  let itemId = existing?.itemId;
  if (!itemId) {
    const [item] = await transaction
      .insert(financialItems)
      .values({ householdId, kind })
      .returning();
    itemId = item.id;
  }
  if (existing && !replaces) {
    await adapter.close(existing, {
      itemId,
      scheduledDay: existing.scheduledDay ?? request.scheduledDay ?? null,
      effectiveThrough: asDate(dayBefore(requestedDate)),
      endsOn: asDate(dayBefore(requestedDate).slice(0, 7)),
      revision: existing.revision + 1,
    });
  }
  return adapter.save(
    existing,
    {
      itemId,
      startsOn: date ? asDate(date.slice(0, 7)) : null,
      endsOn: through ? asDate(through.slice(0, 7)) : null,
      effectiveFrom: date ? asDate(date) : null,
      effectiveThrough: through ? asDate(through) : null,
      scheduledDay: request.scheduledDay ?? existing?.scheduledDay ?? null,
      revision: replaces ? existing!.revision + 1 : 1,
    },
    replaces,
  );
}
