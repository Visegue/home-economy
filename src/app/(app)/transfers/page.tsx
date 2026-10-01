import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFundingData } from "@/features/funding/data";
import { TransferDialog } from "@/features/funding/transfer-form";
import {
  currentPeriod,
  monthLabel,
  periodSchema,
} from "@/features/budget/model";
import { appliesOn, dateLabel, monthEnd } from "@/features/periods/model";
import { formatBudgetSek } from "@/lib/money";

export const metadata = { title: "Överföringar och värden" };
export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const query = await searchParams;
  const period = periodSchema.safeParse(query.month).success
    ? query.month!
    : currentPeriod();
  const { purposes } = await getFundingData(period);
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/?month=${period}`} className="text-sm underline">
          Till månadsöversikten
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Överföringar och värden</h1>
        <p className="text-muted-foreground">
          Bekräftade insättningar och uttag per ändamål.
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <label htmlFor="funding-month" className="space-y-1">
          Avser månad
          <Input
            id="funding-month"
            aria-label="Avser månad"
            className="block rounded-md border p-2"
            type="month"
            name="month"
            defaultValue={period}
            required
          />
        </label>
        <Button>Visa</Button>
      </form>
      {purposes.length ? (
        purposes.map((purpose) => (
          <Card key={purpose.itemId ?? `${purpose.source}-${purpose.id}`}>
            <CardHeader>
              <CardTitle>{purpose.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt>Planerat {monthLabel(period)}</dt>
                  <dd>{formatBudgetSek(purpose.progress.plannedInOre)}</dd>
                </div>
                <div>
                  <dt>Insatt för månaden</dt>
                  <dd>{formatBudgetSek(purpose.progress.depositedInOre)}</dd>
                </div>
                <div>
                  <dt>
                    {purpose.progress.excessInOre
                      ? "Över plan"
                      : "Kvar enligt plan"}
                  </dt>
                  <dd>
                    {formatBudgetSek(
                      purpose.progress.excessInOre ||
                        purpose.progress.remainingInOre,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Öronmärkt värde idag</dt>
                  <dd
                    className={
                      purpose.valueInOre < 0
                        ? "text-destructive"
                        : "font-semibold"
                    }
                  >
                    {formatBudgetSek(purpose.valueInOre)}
                  </dd>
                </div>
                <div>
                  <dt>Värde {dateLabel(monthEnd(period))}</dt>
                  <dd>{formatBudgetSek(purpose.monthEndValueInOre)}</dd>
                </div>
              </dl>
              {purpose.scheduledOn ? (
                <p className="text-sm text-muted-foreground">
                  Planerad insättningsdag: {dateLabel(purpose.scheduledOn)}.
                  Registrering sker först när du bekräftar.
                </p>
              ) : null}
              {purpose.valueInOre < 0 ? (
                <output className="text-destructive">
                  Negativt registrerat värde. Kontrollera insättningar och
                  ingående värde.
                </output>
              ) : null}
              {purpose.versions
                .filter(
                  (v) =>
                    "nextDueOn" in v &&
                    v.destination !== "direct" &&
                    v.nextDueOn?.slice(0, 7) === period &&
                    appliesOn(v, v.nextDueOn),
                )
                .map((v) =>
                  "nextDueOn" in v ? (
                    <p key={v.id} className="text-sm">
                      Förväntat uttag {dateLabel(v.nextDueOn!)}:{" "}
                      {formatBudgetSek(v.amountInOre)}. Värdet minskar först när
                      ett uttag registreras.
                    </p>
                  ) : null,
                )}
              <TransferDialog purpose={purpose} />
              <details>
                <summary className="cursor-pointer">
                  Överföringshistorik ({purpose.transfers.length})
                </summary>
                <ul className="mt-3 divide-y">
                  {purpose.transfers.map((t) => (
                    <li key={t.id} className="py-2 text-sm">
                      {dateLabel(t.occurredOn)} ·{" "}
                      {t.kind === "opening"
                        ? "Ingående värde"
                        : t.kind === "deposit"
                          ? "Insättning"
                          : "Uttag"}{" "}
                      · {formatBudgetSek(t.amountInOre)} · avser{" "}
                      {monthLabel(t.attributionMonth)}
                      {t.note ? ` · ${t.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>Inga avsatta utgifter, avräkningar eller sparanden ännu.</p>
      )}
    </div>
  );
}
