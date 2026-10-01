import { z } from "zod";
import { amountSchema, periodSchema } from "@/features/budget/model";
import { calendarDateSchema } from "@/features/periods/model";

export const transferSchema = z
  .object({
    id: z.uuid(),
    itemId: z.uuid().optional(),
    source: z.enum(["expense", "saving"]),
    versionId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.enum(["deposit", "withdrawal", "opening"]),
    amount: amountSchema,
    occurredOn: calendarDateSchema,
    attributionMonth: periodSchema,
    note: z.string().trim().max(500),
    confirmNegative: z.boolean().default(false),
  })
  .refine(
    (v) => v.kind === "opening" || v.amount > 0,
    "Beloppet måste vara större än noll.",
  );
export interface Transfer {
  id: string;
  itemId: string;
  kind: string;
  amountInOre: number;
  occurredOn: string;
  attributionMonth: string;
  note: string;
}
export function transferValue(
  transfer: Pick<Transfer, "kind" | "amountInOre">,
) {
  return transfer.kind === "withdrawal"
    ? -transfer.amountInOre
    : transfer.amountInOre;
}
export function valueOn(transfers: Transfer[], date: string) {
  return transfers
    .filter((t) => t.occurredOn <= date)
    .reduce((total, t) => total + transferValue(t), 0);
}
export function fundingProgress(
  transfers: Transfer[],
  period: string,
  planned: number,
) {
  const deposited = transfers
    .filter((t) => t.kind === "deposit" && t.attributionMonth === period)
    .reduce((sum, t) => sum + t.amountInOre, 0);
  return {
    plannedInOre: planned,
    depositedInOre: deposited,
    remainingInOre: Math.max(0, planned - deposited),
    excessInOre: Math.max(0, deposited - planned),
  };
}
