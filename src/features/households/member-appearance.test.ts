import { describe, expect, it } from "vitest";
import {
  memberInitials,
  memberTextColor,
  memberColorForIndex,
  memberColors,
} from "./member-appearance";
import { personSchema } from "@/features/budget/model";

describe("member icons", () => {
  it("cycles through the palette in member order", () => {
    expect(memberColorForIndex(0)).toBe("#d5b8ca");
    expect(memberColorForIndex(1)).toBe("#d6c6e5");
    expect(memberColorForIndex(memberColors.length)).toBe("#d5b8ca");
    expect(memberColorForIndex(memberColors.length + 1)).toBe("#d6c6e5");
  });
  it.each([
    ["Kim", "KI"],
    ["Kim Ny", "KN"],
    ["  Anna Maria Öberg  ", "AÖ"],
    ["Åsa-Li", "ÅL"],
    ["A\u030asa", "ÅS"],
    ["Ö", "Ö"],
    ["", "?"],
  ])("creates initials for %s", (name, initials) => {
    expect(memberInitials(name)).toBe(initials);
  });

  it("keeps initials readable on light and dark custom backgrounds", () => {
    expect(memberTextColor("#ffffff")).toBe("#000000");
    expect(memberTextColor("#ffff00")).toBe("#000000");
    expect(memberTextColor("#000000")).toBe("#ffffff");
    expect(memberTextColor("#356b9b")).toBe("#ffffff");
  });

  it("validates and normalizes saved colors and supports older forms", () => {
    expect(personSchema.parse({ name: "Kim", color: "#AABBCC" }).color).toBe(
      "#aabbcc",
    );
    expect(personSchema.parse({ name: "Kim" }).color).toBeUndefined();
    for (const color of ["red", "#fff", "#1234567", "", "url(example)"]) {
      expect(personSchema.safeParse({ name: "Kim", color }).success).toBe(
        false,
      );
    }
  });
});
