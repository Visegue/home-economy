import { describe, expect, it } from "vitest";

import {
  evaluateVersionChange,
  needsVersionBump,
} from "./check-pr-version.mjs";

describe("PR version gate", () => {
  it.each([
    "src/app/page.tsx",
    "src/db/schema/household.ts",
    "public/logo.svg",
    "drizzle/0001.sql",
    "scripts/deploy-preview.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "next.config.ts",
    "vercel.json",
    "proxy.ts",
    "middleware.ts",
    "instrumentation.ts",
    "instrumentation-client.ts",
    "tsconfig.json",
    "tsconfig.build.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "pnpm-workspace.yaml",
    ".npmrc",
    ".node-version",
    ".nvmrc",
  ])("requires a bump for %s", (path) => {
    expect(needsVersionBump(path)).toBe(true);
    expect(evaluateVersionChange("0.3.1", "0.3.1", [path]).blocked).toBe(true);
  });

  it.each([
    "README.md",
    "docs/release-runbook.md",
    ".github/workflows/ci.yml",
    "src/lib/money.test.ts",
    "scripts/check-pr-version.test.mjs",
    "e2e/household.spec.ts",
  ])("allows %s without a bump", (path) => {
    expect(needsVersionBump(path)).toBe(false);
  });

  it("blocks app changes with an unchanged, lower, or build-only version", () => {
    for (const version of ["1.2.3", "1.2.2", "1.2.3+new-build"]) {
      expect(
        evaluateVersionChange("1.2.3+old-build", version, ["src/app/page.tsx"])
          .blocked,
      ).toBe(true);
    }
  });

  it("accepts all increasing SemVer types", () => {
    expect(
      evaluateVersionChange("1.0.0-beta.1", "1.0.0-beta.2", ["src/a.ts"])
        .blocked,
    ).toBe(false);
    expect(
      evaluateVersionChange("1.0.0-rc.1", "1.0.0", ["src/a.ts"]).blocked,
    ).toBe(false);
    expect(
      evaluateVersionChange("1.0.0", "2.0.0-alpha.1+build.5", ["src/a.ts"])
        .blocked,
    ).toBe(false);
  });

  it("allows documentation-only changes without a bump", () => {
    expect(evaluateVersionChange("1.2.3", "1.2.3", ["README.md"]).blocked).toBe(
      false,
    );
  });

  it("rejects invalid versions even for documentation-only changes", () => {
    expect(
      evaluateVersionChange("1.2.3", "1.2.3-01", ["README.md"]).blocked,
    ).toBe(true);
  });
});
