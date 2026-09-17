import { describe, expect, it } from "vitest";

import {
  compareVersions,
  isSemVerVersion,
  parseVersion,
} from "./check-app-version.mjs";

describe("SemVer app version", () => {
  it.each([
    "0.1.0",
    "1.0.0",
    "12.34.56",
    "1.2.3-alpha",
    "1.2.3-alpha.1",
    "1.2.3-0.3.7",
    "1.2.3-x.7.z.92",
    "1.2.3+20130313144700",
    "1.2.3-beta+exp.sha.5114f85",
    "999999999999999999999.0.0",
  ])("accepts %s", (version) => {
    expect(isSemVerVersion(version)).toBe(true);
  });

  it.each([
    "01.0.0",
    "1.02.3",
    "1.2",
    "v1.2.3",
    "1.2.3\n",
    "1.2.3-01",
    "1.2.3-alpha..1",
    "1.2.3+",
    "1.2.3+build..1",
    "1.2.3-ä",
    "",
  ])("rejects %s", (version) => {
    expect(isSemVerVersion(version)).toBe(false);
  });

  it("compares pre-releases, normal releases and build metadata", () => {
    const ordered = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0",
      "2.0.0",
    ];
    for (let index = 1; index < ordered.length; index++) {
      expect(compareVersions(ordered[index], ordered[index - 1])).toBe(1);
    }
    expect(compareVersions("1.2.3+build.2", "1.2.3+build.1")).toBe(0);
    expect(compareVersions("999999999999999999999.0.0", "2.0.0")).toBe(1);
    expect(parseVersion("1.2.3-beta+sha.1")?.build).toEqual(["sha", "1"]);
  });
});
