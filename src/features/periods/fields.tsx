"use client";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateLabel, type VersionMetadata } from "./model";

export type DayDefaults = {
  incomeDay: number;
  directDay: number;
  allocatedDay: number;
  replacementDay: number;
  savingDay: number;
};
const Defaults = createContext<DayDefaults>({
  incomeDay: 25,
  directDay: 25,
  allocatedDay: 25,
  replacementDay: 25,
  savingDay: 25,
});
export function DayDefaultsProvider({
  days,
  children,
}: {
  days: DayDefaults;
  children: ReactNode;
}) {
  return <Defaults value={days}>{children}</Defaults>;
}
type ItemType = "income" | "direct" | "allocated" | "settlement" | "saving";
export function useVersionFields(type: ItemType, version?: VersionMetadata) {
  const defaults = useContext(Defaults);
  const [mode, setMode] = useState("change");
  const [days, setDays] = useState<Partial<Record<ItemType, string>>>({});
  const key =
    type === "settlement"
      ? "replacementDay"
      : (`${type}Day` as keyof DayDefaults);
  const scheduledDay =
    days[type] ?? String(version?.scheduledDay ?? defaults[key]);
  return {
    mode,
    setMode,
    scheduledDay,
    setScheduledDay: (day: string) =>
      setDays((previous) => ({ ...previous, [type]: day })),
  };
}
export function VersionFields({
  version,
  fields,
}: {
  version?: VersionMetadata;
  fields: ReturnType<typeof useVersionFields>;
}) {
  const id = useId();
  return (
    <>
      {version?.revision ? (
        <input type="hidden" name="revision" value={version.revision} />
      ) : null}
      {version ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-mode`}>Typ av ändring</Label>
          <Select
            name="mode"
            value={fields.mode}
            onValueChange={fields.setMode}
          >
            <SelectTrigger id={`${id}-mode`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="change">Ändra från valt datum</SelectItem>
              <SelectItem value="correct">Rätta denna version</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            En rättelse behåller versionens startdatum och uppdaterar även
            historiska månadsbelopp.
          </p>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${id}-day`}>Planerad dag i månaden</Label>
        <Input
          id={`${id}-day`}
          name="scheduledDay"
          type="number"
          min={1}
          max={31}
          value={fields.scheduledDay}
          onChange={(event) => fields.setScheduledDay(event.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Sista dagen används i kortare månader. Ingen överföring görs
          automatiskt.
        </p>
      </div>
      {version?.effectiveThrough ? (
        <p className="rounded-md bg-muted p-3 text-sm">
          Denna version gäller till och med{" "}
          {dateLabel(version.effectiveThrough)}. Senare ändringar bevaras.{" "}
          <Link className="underline" href="/history">
            Visa och redigera kommande ändringar
          </Link>
        </p>
      ) : null}
    </>
  );
}
