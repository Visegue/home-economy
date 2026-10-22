import { z } from "zod";
import { amountSchema, periodSchema } from "@/features/budget/model";
import { calendarDateSchema, versionBounds } from "@/features/periods/model";
import type { getFundingData } from "./data";

export type FundingPurpose = Pick<
  Awaited<ReturnType<typeof getFundingData>>["purposes"][number],
  "source" | "id" | "itemId" | "versions" | "inMonthlyPlan" | "progress"
>;

export function purposeKey(
  purpose: Pick<FundingPurpose, "source" | "id" | "itemId">,
) {
  return purpose.itemId ?? `${purpose.source}-${purpose.id}`;
}

// Ended purposes retain their last name; versions that have not begun never supply a label.
export function batchPurposeOn(purpose: FundingPurpose, date: string) {
  if (!purpose.inMonthlyPlan) return undefined;
  return purpose.versions.findLast((version) => {
    const start = versionBounds(version).start;
    return !start || start <= date;
  });
}

export const depositBatchSchema = z
  .object({
    id: z.uuid(),
    attributionMonth: periodSchema,
    occurredOn: calendarDateSchema,
    confirmNegative: z.boolean().default(false),
    rows: z
      .array(
        z.object({
          id: z.uuid(),
          itemId: z.uuid().optional(),
          source: z.enum(["expense", "saving"]),
          versionId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          amount: amountSchema.refine(
            (amount) => amount > 0,
            "Beloppet måste vara större än noll.",
          ),
        }),
      )
      .min(1, "Välj minst en insättning.")
      .max(1000),
  })
  .superRefine((data, context) => {
    const purposes = data.rows.map(
      (row) => row.itemId ?? `${row.source}-${row.versionId}`,
    );
    if (
      new Set(purposes).size !== purposes.length ||
      new Set(data.rows.map((row) => row.id)).size !== data.rows.length
    )
      context.addIssue({
        code: "custom",
        message: "Samma ändamål får bara väljas en gång i bekräftelsen.",
      });
    if (
      !Number.isSafeInteger(data.rows.reduce((sum, row) => sum + row.amount, 0))
    )
      context.addIssue({ code: "custom", message: "Totalsumman är för stor." });
  });

export interface DepositBatchResult {
  count: number;
  totalInOre: number;
  occurredOn: string;
  attributionMonth: string;
}
