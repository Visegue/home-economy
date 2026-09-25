import { describe, expect, it } from "vitest";
import { memberInitials, memberTextColor } from "./member-appearance";
import { personSchema } from "@/features/budget/model";

describe("member icons", () => {
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
    expect(personSchema.parse({ name: "Kim" }).color).toBe("#85466b");
    for (const color of ["red", "#fff", "#1234567", "", "url(example)"]) {
      expect(personSchema.safeParse({ name: "Kim", color }).success).toBe(
        false,
      );
    }
  });
});
