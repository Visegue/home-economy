import { z } from "zod";

export const calendarDateSchema = z.iso
  .date({ error: "Ange ett giltigt datum." })
  .refine(
    (value) => value >= "1900-01-01" && value <= "2199-12-31",
    "Datumet måste ligga mellan 1900 och 2199.",
  );
export const effectiveDateSchema = z.union([
  calendarDateSchema,
  z.string().regex(/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/),
]);
export const scheduledDaySchema = z.coerce.number().int().min(1).max(31);
export const writeOptionsSchema = z.object({
  mode: z.enum(["change", "correct"]).optional(),
  revision: z.coerce.number().int().positive().optional(),
  scheduledDay: scheduledDaySchema.optional(),
});
export type WriteOptions = z.infer<typeof writeOptionsSchema>;
export function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
export function firstDate(value: string) {
  effectiveDateSchema.parse(value);
  return value.length === 7 ? `${value}-01` : value;
}
export function monthEnd(period: string) {
  const [y, m] = period.slice(0, 7).split("-").map(Number);
  return dateOnly(new Date(Date.UTC(y, m, 0)));
}
export function dayBefore(date: string) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() - 1);
  return dateOnly(result);
}
export function dayAfter(date: string) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + 1);
  return dateOnly(result);
}
export function asDate(value: string) {
  return new Date(`${firstDate(value)}T00:00:00Z`);
}
export function currentDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(asDate(value));
}
export function scheduledDate(period: string, day: number) {
  return `${period}-${String(Math.min(day, Number(monthEnd(period).slice(8)))).padStart(2, "0")}`;
}

export interface VersionMetadata {
  active?: boolean;
  itemId?: string | null;
  effectiveFrom?: string | null;
  effectiveThrough?: string | null;
  scheduledDay?: number | null;
  revision?: number;
}
export function storedMetadata(row: {
  itemId: string | null;
  effectiveFrom: Date | null;
  effectiveThrough: Date | null;
  scheduledDay: number | null;
  revision: number;
  active?: boolean;
}): VersionMetadata {
  return {
    active: row.active ?? true,
    itemId: row.itemId,
    effectiveFrom: row.effectiveFrom ? dateOnly(row.effectiveFrom) : null,
    effectiveThrough: row.effectiveThrough
      ? dateOnly(row.effectiveThrough)
      : null,
    scheduledDay: row.scheduledDay,
    revision: row.revision,
  };
}
export interface PeriodVersion extends VersionMetadata {
  id: number;
  startsOn: string | null;
  endsOn: string | null;
}
export function versionBounds(item: PeriodVersion) {
  return {
    start:
      item.effectiveFrom ?? (item.startsOn ? firstDate(item.startsOn) : null),
    end: item.effectiveThrough ?? (item.endsOn ? monthEnd(item.endsOn) : null),
  };
}
export function appliesOn(item: PeriodVersion, date: string) {
  const { start, end } = versionBounds(item);
  return (
    item.active !== false && (!start || start <= date) && (!end || end >= date)
  );
}
export function formDate(period: string, item?: PeriodVersion) {
  const date = firstDate(period);
  if (!item) return date;
  const { start, end } = versionBounds(item);
  return start && date < start ? start : end && date > end ? end : date;
}
export function selectMonthlyVersions<T extends PeriodVersion>(
  period: string,
  rows: T[],
) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.itemId ?? `legacy-${row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const first = `${period}-01`,
    last = monthEnd(period);
  return [...groups.values()].flatMap((versions) => {
    versions.sort((a, b) =>
      (versionBounds(a).start ?? "").localeCompare(
        versionBounds(b).start ?? "",
      ),
    );
    const overlapping = versions.filter((v) => {
      const { start, end } = versionBounds(v);
      return (
        v.active !== false &&
        (!start || start <= last) &&
        (!end || end >= first)
      );
    });
    if (!overlapping.length) return [];
    const display = overlapping.at(-1)!;
    // A single expected contribution. Actual transfers are independently confirmed.
    const basis = overlapping
      .filter(
        (v) =>
          v.scheduledDay == null ||
          appliesOn(v, scheduledDate(period, v.scheduledDay)),
      )
      .at(-1);
    const changes = overlapping.flatMap((v) => {
      const index = versions.indexOf(v),
        date = versionBounds(v).start;
      return date && date >= first && index > 0
        ? [{ date, previous: versions[index - 1], next: v }]
        : [];
    });
    return [{ display, basis, changes, ended: !appliesOn(display, last) }];
  });
}
