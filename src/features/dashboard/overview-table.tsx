import type { ReactNode } from "react";
import { ManagementOnly } from "@/components/card-management";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { dateLabel } from "@/features/periods/model";
import { formatBudgetSek } from "@/lib/money";
import { ItemDetails } from "./item-details";

export function RecordedValue({
  valueInOre,
  hasOpening,
}: {
  valueInOre: number;
  hasOpening: boolean;
}) {
  return (
    <>
      <span
        className={
          valueInOre < 0
            ? "[overflow-wrap:normal] text-destructive"
            : "[overflow-wrap:normal]"
        }
      >
        {formatBudgetSek(valueInOre).replaceAll("\u00a0", " ")}
      </span>
      {!hasOpening ? (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          Ingående värde saknas
        </span>
      ) : null}
    </>
  );
}

export function OverviewTable({
  label,
  rows,
  totalInOre,
  recordedTotal,
  valueDate,
  period,
}: {
  label: string;
  period: string;
  rows: {
    id: number;
    name: string;
    amountInOre: number;
    changed: boolean;
    details: ReactNode;
    actions: ReactNode;
    funding?: { valueInOre: number; hasOpening: boolean };
  }[];
  totalInOre: number;
  recordedTotal?: { valueInOre: number; hasMissingOpening: boolean };
  valueDate: string;
}) {
  return (
    <Table
      aria-label={label}
      className="table-fixed [&_td]:align-top [&_td]:[overflow-wrap:anywhere] [&_td]:whitespace-normal [&_th]:whitespace-normal"
    >
      {recordedTotal ? (
        <caption className="pb-3 text-left text-xs text-muted-foreground">
          Registrerat värde {dateLabel(valueDate)}. Planerade avsättningar ingår
          inte.
        </caption>
      ) : null}
      <TableHeader>
        <TableRow>
          <TableHead>Namn</TableHead>
          <TableHead className="text-right">Per månad</TableHead>
          {recordedTotal ? (
            <TableHead className="text-right">Totalt undansparat</TableHead>
          ) : null}
          <ManagementOnly>
            <TableHead>
              <span className="sr-only">Åtgärder</span>
            </TableHead>
          </ManagementOnly>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <ItemDetails
            key={`${period}-${row.id}`}
            name={row.name}
            changed={row.changed}
            cells={
              <>
                <TableCell className="text-right font-medium tabular-nums">
                  <span className="[overflow-wrap:normal]">
                    {formatBudgetSek(row.amountInOre).replaceAll("\u00a0", " ")}
                  </span>
                </TableCell>
                {recordedTotal && row.funding ? (
                  <TableCell className="text-right tabular-nums">
                    <RecordedValue {...row.funding} />
                  </TableCell>
                ) : null}
                <ManagementOnly>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {row.actions}
                    </div>
                  </TableCell>
                </ManagementOnly>
              </>
            }
          >
            {row.details}
          </ItemDetails>
        ))}
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell>Totalt per månad</TableCell>
          <TableCell className="text-right tabular-nums">
            <span className="[overflow-wrap:normal]">
              {formatBudgetSek(totalInOre).replaceAll("\u00a0", " ")}
            </span>
          </TableCell>
          {recordedTotal ? (
            <TableCell className="text-right tabular-nums">
              <RecordedValue
                valueInOre={recordedTotal.valueInOre}
                hasOpening={!recordedTotal.hasMissingOpening}
              />
            </TableCell>
          ) : null}
          <ManagementOnly>
            <TableCell />
          </ManagementOnly>
        </TableRow>
      </TableBody>
    </Table>
  );
}
