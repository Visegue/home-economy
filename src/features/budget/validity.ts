import { periodSchema, shiftPeriod } from "./model";

export function periodDate(period: string) {
  return new Date(`${periodSchema.parse(period)}-01T00:00:00Z`);
}

// Reject stale edits after another request has split or ended this period.
export function validateEffectivePeriod(
  period: string,
  item: { startsOn: Date | null; endsOn: Date | null },
) {
  periodSchema.parse(period);
  const start = item.startsOn?.toISOString().slice(0, 7);
  const end = item.endsOn?.toISOString().slice(0, 7);
  if ((start && period < start) || (end && period > end)) {
    throw new Error(
      "Ändringen måste ligga inom postens giltighetsperiod. Ladda om sidan och försök igen.",
    );
  }
  return {
    startsOn: periodDate(period),
    previousEndsOn: new Date(`${shiftPeriod(period, -1)}-01T00:00:00Z`),
    replacesWholePeriod: period === start,
  };
}
