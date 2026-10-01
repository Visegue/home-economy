import { describe, expect, it } from "vitest";
import {
  effectiveDateSchema,
  scheduledDate,
  selectMonthlyVersions,
  type PeriodVersion,
} from "./model";

describe("calendar-date monthly projections", () => {
  it("validates real dates and clamps scheduled days including leap years", () => {
    expect(effectiveDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(effectiveDateSchema.safeParse("2026-02-20").success).toBe(true);
    expect(scheduledDate("2026-02", 31)).toBe("2026-02-28");
    expect(scheduledDate("2028-02", 31)).toBe("2028-02-29");
    expect(scheduledDate("2026-04", 31)).toBe("2026-04-30");
  });
  it("shows a final version but counts a single scheduled contribution across multiple changes", () => {
    const base: PeriodVersion = {
      id: 1,
      itemId: "same",
      startsOn: "2026-10-01",
      endsOn: null,
      scheduledDay: 15,
    };
    const rows = [
      { ...base, effectiveThrough: "2026-10-19" },
      {
        ...base,
        id: 2,
        effectiveFrom: "2026-10-20",
        effectiveThrough: "2026-10-24",
      },
      { ...base, id: 3, effectiveFrom: "2026-10-25" },
    ];
    const [result] = selectMonthlyVersions("2026-10", rows);
    expect(result.display.id).toBe(3);
    expect(result.basis?.id).toBe(1);
    expect(result.changes.map((c) => c.date)).toEqual([
      "2026-10-20",
      "2026-10-25",
    ]);
    expect(
      selectMonthlyVersions(
        "2026-10",
        rows.map((v) => ({ ...v, scheduledDay: 25 })),
      )[0].basis?.id,
    ).toBe(3);
  });
  it("keeps identical legacy names independent and excludes inactive versions", () => {
    const base = { id: 1, startsOn: null, endsOn: null, name: "Samma namn" };
    expect(
      selectMonthlyVersions("2026-10", [base, { ...base, id: 2 }]),
    ).toHaveLength(2);
    expect(
      selectMonthlyVersions("2026-10", [{ ...base, active: false }]),
    ).toEqual([]);
  });
});
