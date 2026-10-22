import "server-only";
import { and, eq } from "drizzle-orm";
import { withAuthenticatedDatabase } from "@/db/authorized";
import { confirmedTransfers, depositBatches, households } from "@/db/schema";
import { currentDate } from "@/features/periods/model";
import { PeriodWriteError } from "@/features/periods/write";
import {
  batchPurposeOn,
  depositBatchSchema,
  type DepositBatchResult,
} from "./batch-model";
import { readFundingData, writeTransfer } from "./data";

class NegativeBatchWarning extends Error {}

export async function confirmDepositBatch(input: unknown): Promise<{
  result?: DepositBatchResult;
  warning?: string;
}> {
  const parsed = depositBatchSchema.safeParse(input);
  if (!parsed.success)
    throw new PeriodWriteError(
      parsed.error.issues[0]?.message ?? "Ogiltiga insättningar.",
    );
  const data = parsed.data;
  // Confirmation consent is not part of the persisted monetary request.
  const request = JSON.stringify({
    attributionMonth: data.attributionMonth,
    occurredOn: data.occurredOn,
    rows: [...data.rows].sort((a, b) => a.id.localeCompare(b.id)),
  });
  try {
    return await withAuthenticatedDatabase(async (transaction, user) => {
      // A non-key household lock serializes batches while allowing individual inserts
      // to acquire the household FK key-share lock. Individual ledger writes
      // still acquire their usual stable-identity locks below, in a consistent order.
      const [household] = await transaction
        .select()
        .from(households)
        .where(eq(households.ownerUserId, user.id))
        .for("no key update");
      if (!household)
        throw new PeriodWriteError("Hushållet kunde inte hittas.");
      const [saved] = await transaction
        .select()
        .from(depositBatches)
        .where(
          and(
            eq(depositBatches.id, data.id),
            eq(depositBatches.householdId, household.id),
          ),
        );
      if (saved) {
        if (saved.request !== request)
          throw new PeriodWriteError(
            "Den här bekräftelsen har redan sparats med andra värden. Stäng formuläret och öppna det igen.",
          );
        return { result: JSON.parse(saved.result) as DepositBatchResult };
      }
      if (data.occurredOn > currentDate())
        throw new PeriodWriteError(
          "Bekräfta först när insättningarna har utförts. Datumet får inte ligga i framtiden.",
        );
      const funding = await readFundingData(
        transaction,
        user.id,
        data.attributionMonth,
      );
      const rows = [...data.rows].sort((a, b) =>
        (a.itemId ?? `${a.source}-${a.versionId}`).localeCompare(
          b.itemId ?? `${b.source}-${b.versionId}`,
        ),
      );
      for (const row of rows) {
        const purpose = funding.purposes.find(
          (purpose) =>
            purpose.source === row.source &&
            purpose.id === row.versionId &&
            purpose.itemId === (row.itemId ?? null),
        );
        if (!purpose || !batchPurposeOn(purpose, data.occurredOn))
          throw new PeriodWriteError(
            "Ett valt ändamål är inte tillgängligt för månaden och utfört datum. Kontrollera urvalet eller öppna formuläret igen.",
          );
        // Per-row ids must belong exclusively to this batch, never replay another confirmation.
        const [existing] = await transaction
          .select({ id: confirmedTransfers.id })
          .from(confirmedTransfers)
          .where(eq(confirmedTransfers.id, row.id));
        if (existing)
          throw new PeriodWriteError(
            "En insättning är redan registrerad. Öppna formuläret igen.",
          );
        const result = await writeTransfer(transaction, user, {
          ...row,
          amount: row.amount,
          kind: "deposit",
          note: "",
          attributionMonth: data.attributionMonth,
          occurredOn: data.occurredOn,
          confirmNegative: data.confirmNegative,
        });
        // Throwing rolls back earlier rows, including legacy identity upgrades.
        if (result.warning) throw new NegativeBatchWarning(result.warning);
      }
      const result: DepositBatchResult = {
        count: rows.length,
        totalInOre: rows.reduce((sum, row) => sum + row.amount, 0),
        occurredOn: data.occurredOn,
        attributionMonth: data.attributionMonth,
      };
      await transaction.insert(depositBatches).values({
        id: data.id,
        householdId: household.id,
        request,
        result: JSON.stringify(result),
      });
      return { result };
    });
  } catch (error) {
    if (error instanceof NegativeBatchWarning)
      return { warning: error.message };
    throw error;
  }
}
