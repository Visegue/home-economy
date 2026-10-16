// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const directories = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runScenario(scenario) {
  const directory = mkdtempSync(join(tmpdir(), "playwright-diagnostics-"));
  directories.push(directory);
  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-playwright.mjs",
      "test",
      "--config=.github/fixtures/playwright/playwright.config.ts",
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 20_000,
      env: {
        ...process.env,
        CI: "1",
        DIAGNOSTICS_DIRECTORY: directory,
        DIAGNOSTICS_SCENARIO: scenario,
        PLAYWRIGHT_HTML_OUTPUT_DIR: join(directory, "html"),
        PLAYWRIGHT_HTML_OPEN: "never",
        PLAYWRIGHT_JSON_OUTPUT_FILE: join(directory, "report.json"),
      },
    },
  );
  if (result.error) throw result.error;
  const traces = readdirSync(join(directory, "test-results"), {
    recursive: true,
  }).filter((path) => path.endsWith("trace.zip"));
  return { directory, traces, result };
}

function summarize(directory) {
  const output = join(directory, "github-output");
  const summary = join(directory, "github-summary");
  const result = spawnSync(
    process.execPath,
    [
      ".github/scripts/summarize-playwright.mjs",
      join(directory, "report.json"),
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 5_000,
      env: {
        ...process.env,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
      },
    },
  );
  expect(result.status).toBe(0);
  return {
    output: readFileSync(output, "utf8"),
    summary: readFileSync(summary, "utf8"),
  };
}

it("retains the original failure and successful retry traces in a green run", () => {
  const { traces, result } = runScenario("flaky");
  expect(result.status).toBe(0);
  expect(traces).toHaveLength(2);
  expect(traces.some((path) => !path.includes("retry"))).toBe(true);
}, 30_000);

it("produces accessible HTML and machine-readable retry results", () => {
  const { directory, result } = runScenario("flaky");
  expect(result.status).toBe(0);
  expect(existsSync(join(directory, "html/index.html"))).toBe(true);
  const report = JSON.parse(
    readFileSync(join(directory, "report.json"), "utf8"),
  );
  expect(report.stats).toMatchObject({ expected: 0, flaky: 1, unexpected: 0 });
}, 30_000);

it("marks green retry runs for upload and names the retried test", () => {
  const { directory, result } = runScenario("flaky");
  expect(result.status).toBe(0);
  const { output, summary } = summarize(directory);
  expect(output).toBe("retain=true\n");
  expect(summary).toContain("Godkända efter omförsök: **1**");
  expect(summary).toContain("Omförsök totalt: **1**");
  expect(summary).toContain("syntetiskt diagnostikfall");
  expect(summary).toContain("failed → passed");
}, 30_000);

it("discards clean first-run traces and does not request an artifact upload", () => {
  const { directory, traces, result } = runScenario("passed");
  expect(result.status).toBe(0);
  expect(traces).toHaveLength(0);
  const { output, summary } = summarize(directory);
  expect(output).toBe("retain=false\n");
  expect(summary).toContain("Direkt godkända: **1**");
  expect(summary).toContain("Omförsök totalt: **0**");
}, 30_000);

it("preserves final failures, their traces and the runner's failing exit code", () => {
  const { directory, traces, result } = runScenario("failed");
  expect(result.status).toBe(1);
  expect(traces).toHaveLength(2);
  const { output, summary } = summarize(directory);
  expect(output).toBe("retain=true\n");
  expect(summary).toContain("Slutligt misslyckade: **1**");
  expect(summary).toContain("failed → failed");
}, 30_000);

it.each(["missing", "malformed"])(
  "rejects a %s report instead of declaring a clean run",
  (kind) => {
    const directory = mkdtempSync(join(tmpdir(), "playwright-report-error-"));
    directories.push(directory);
    const file = join(directory, "report.json");
    if (kind === "malformed") writeFileSync(file, "not json");
    const result = spawnSync(
      process.execPath,
      [".github/scripts/summarize-playwright.mjs", file],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Playwright-rapport saknas");
  },
);
