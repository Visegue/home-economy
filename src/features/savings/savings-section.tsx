import {
  CardManagement,
  CardManagementButton,
} from "@/components/card-management";
import { PiggyBank } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
import type { getMonthlyOverview } from "@/features/dashboard/monthly-overview";
import { OverviewTable } from "@/features/dashboard/overview-table";
import { PostDetails } from "@/features/dashboard/post-details";
import { SavingDialog, RemoveSavingDialog } from "./saving-form";
export function SavingsSection({
  savings,
  totalInOre,
  period,
  valueDate,
  recordedTotal,
}: {
  savings: Awaited<ReturnType<typeof getMonthlyOverview>>["savings"];
  totalInOre: number;
  period: string;
  valueDate: string;
  recordedTotal: { valueInOre: number; hasMissingOpening: boolean };
}) {
  return (
    <section aria-label="Spara" className="mt-4">
      <CardManagement key={period} hasItems={savings.length > 0}>
        <CollapsibleCard
          title="Spara"
          icon={
            <PiggyBank
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          }
          actions={
            <>
              {savings.length ? (
                <CardManagementButton label="sparande" />
              ) : null}
              <SavingDialog key={period} period={period} />
            </>
          }
        >
          {savings.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Inget sparande ännu.
            </p>
          ) : (
            <OverviewTable
              label="Månadssparande"
              period={period}
              valueDate={valueDate}
              totalInOre={totalInOre}
              recordedTotal={recordedTotal}
              rows={savings.map((saving) => ({
                id: saving.id,
                name: saving.name,
                amountInOre: saving.amountInOre,
                changed: !!(saving.changes.length || saving.ended),
                funding: saving.funding,
                details: (
                  <PostDetails
                    item={saving}
                    source="saving"
                    period={period}
                    valueDate={valueDate}
                  />
                ),
                actions: (
                  <>
                    <SavingDialog
                      key={`${saving.id}-${period}`}
                      saving={{
                        ...saving,
                        amountInOre: saving.displayAmountInOre,
                      }}
                      period={period}
                    />
                    <RemoveSavingDialog
                      key={`remove-${saving.id}-${period}`}
                      saving={saving}
                      period={period}
                    />
                  </>
                ),
              }))}
            />
          )}
        </CollapsibleCard>
      </CardManagement>
    </section>
  );
}
