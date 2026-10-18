// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

function resolvedConfig(args = [], ci = "") {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-playwright.mjs",
      "test",
      "--list",
      "--reporter=json",
      ...args,
    ],
    { encoding: "utf8", timeout: 20_000, env: { ...process.env, CI: ci } },
  );
  if (result.error) throw result.error;
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout).config;
}

it("uses two local workers without a manual override", () => {
  expect(resolvedConfig().workers).toBe(2);
});

it.each([["--workers=1"], ["--workers", "1"]])(
  "honors an explicit CLI worker override (%j)",
  (...args) => {
    expect(resolvedConfig(args).workers).toBe(1);
  },
);

it("keeps CI's automatic 50 percent selection and retries", () => {
  const ci = resolvedConfig([], "1");
  const automatic = resolvedConfig(["--workers=50%"], "1");
  expect(ci.workers).toBe(automatic.workers);
  expect(ci.forbidOnly).toBe(true);
  expect(ci.projects[0].retries).toBe(2);
});
