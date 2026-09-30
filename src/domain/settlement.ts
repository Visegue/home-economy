export interface SettlementAdjustments {
  markupAmountInOre: number | null;
  markupPercent: number | null;
  inflationPercent: number | null;
}

export interface SettlementPlan extends SettlementAdjustments {
  startsOn: string;
}

// numeric(14,2), expressed as integer öre.
const maximumAmountInOre = 99_999_999_999_999;

export function settlementForecast(
  amountInOre: number,
  startsOn: string,
  nextDueOn: string,
  adjustments: SettlementAdjustments,
) {
  const [startYear, startMonth] = startsOn.split("-").map(Number);
  const [dueYear, dueMonth] = nextDueOn.split("-").map(Number);
  const elapsedMonths = (dueYear - startYear) * 12 + dueMonth - startMonth;
  const { markupAmountInOre, markupPercent, inflationPercent } = adjustments;
  if (
    !Number.isSafeInteger(amountInOre) ||
    amountInOre <= 0 ||
    !Number.isInteger(elapsedMonths) ||
    elapsedMonths < 0 ||
    (markupAmountInOre !== null &&
      (!Number.isSafeInteger(markupAmountInOre) || markupAmountInOre < 0)) ||
    (markupPercent !== null &&
      (!Number.isFinite(markupPercent) ||
        markupPercent < 0 ||
        markupPercent > 100)) ||
    (inflationPercent !== null &&
      (!Number.isFinite(inflationPercent) ||
        inflationPercent < 0 ||
        inflationPercent > 100)) ||
    (markupAmountInOre !== null && markupPercent !== null)
  )
    throw new RangeError(
      "Ange giltiga belopp, procentsatser och datum för avräkningen.",
    );

  const adjustedAmount =
    amountInOre +
    (amountInOre * (markupPercent ?? 0)) / 100 +
    (markupAmountInOre ?? 0);
  const targetInOre = Math.round(
    adjustedAmount *
      (1 + (inflationPercent ?? 0) / 100) ** (elapsedMonths / 12),
  );
  if (!Number.isSafeInteger(targetInOre) || targetInOre > maximumAmountInOre) {
    throw new RangeError(
      "Det beräknade totalbeloppet är för stort. Minska beloppet, påslaget eller inflationen.",
    );
  }
  // Save through the month before payment; a payment in the start month needs one transfer.
  const months = Math.max(1, elapsedMonths);
  return { targetInOre, months, monthlyInOre: Math.ceil(targetInOre / months) };
}

export function settlementContribution(
  period: string,
  amountInOre: number,
  nextDueOn: string,
  plan: SettlementPlan,
) {
  const start = plan.startsOn.slice(0, 7);
  const due = nextDueOn.slice(0, 7);
  if (period < start || period > due || (period === due && start !== due))
    return 0;
  const forecast = settlementForecast(
    amountInOre,
    plan.startsOn,
    nextDueOn,
    plan,
  );
  const [year, month] = period.split("-").map(Number);
  const [startYear, startMonth] = start.split("-").map(Number);
  const index = (year - startYear) * 12 + month - startMonth;
  // Adjust the last transfers for öre rounding so the schedule never exceeds the target.
  return Math.max(
    0,
    Math.min(
      forecast.monthlyInOre,
      forecast.targetInOre - index * forecast.monthlyInOre,
    ),
  );
}
