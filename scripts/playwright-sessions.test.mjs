// @vitest-environment node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { sessionIdentity } from "./playwright-sessions.mjs";

const attempt = { testId: "first-test", repeatEachIndex: 0, retry: 0 };

it("reuses an identity only for the same test attempt and role", () => {
  expect(sessionIdentity(attempt)).toEqual(sessionIdentity({ ...attempt }));
  const identities = [
    sessionIdentity(attempt),
    sessionIdentity({ ...attempt, testId: "second-test" }),
    sessionIdentity({ ...attempt, repeatEachIndex: 1 }),
    sessionIdentity({ ...attempt, retry: 1 }),
    sessionIdentity(attempt, "outsider"),
  ];
  expect(new Set(identities.map(({ userId }) => userId)).size).toBe(5);
  expect(
    new Set(identities.flatMap(({ token, otherToken }) => [token, otherToken]))
      .size,
  ).toBe(10);
});

it("discovers every selected test, repetition, retry and role before database seed", () => {
  const output = execFileSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve("@playwright/test/cli")),
      "test",
      "--config=.github/fixtures/playwright/session-isolation.config.ts",
      "--repeat-each=3",
      "--retries=4",
      "--list",
      "--reporter=./scripts/playwright-session-reporter.mjs",
    ],
    { encoding: "utf8" },
  );
  const sessions = JSON.parse(output);
  expect(sessions).toHaveLength(60); // 2 cases × 3 repetitions × 5 attempts × 2 roles
  expect(new Set(sessions.map(({ userId }) => userId)).size).toBe(60);
  expect(new Set(sessions.map(({ token }) => token)).size).toBe(60);
}, 20_000);
