import { dateLabel, dayAfter, type VersionMetadata } from "./model";
import { formatBudgetSek } from "@/lib/money";
export function ChangeNotice({
  item,
}: {
  item: VersionMetadata & {
    changes?: {
      date: string;
      previous: { amountInOre: number };
      next: { amountInOre: number };
    }[];
    ended?: boolean;
  };
}) {
  return (
    <>
      {item.changes?.map((change) => (
        <p
          key={change.date}
          className="text-xs font-normal text-muted-foreground"
        >
          Ändras {dateLabel(change.date)}:{" "}
          {formatBudgetSek(change.previous.amountInOre)} →{" "}
          {formatBudgetSek(change.next.amountInOre)}
        </p>
      ))}
      {item.ended && item.effectiveThrough ? (
        <p className="text-xs font-normal text-muted-foreground">
          Avslutad {dateLabel(dayAfter(item.effectiveThrough))}
        </p>
      ) : null}
    </>
  );
}
