// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function runScenario(scenario) {
  const directory = mkdtempSync(join(tmpdir(), "server-diagnostics-"));
  directories.push(directory);
  if (scenario === "capture-failure")
    writeFileSync(join(directory, "server"), "not a directory");
  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-playwright.mjs",
      "test",
      "--config=.github/fixtures/playwright/server.config.ts",
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 20_000,
      env: {
        ...process.env,
        CI: "1",
        DIAGNOSTICS_DIRECTORY: directory,
        SERVER_SCENARIO: scenario,
        DIAGNOSTICS_TEST_SECRET: "synthetic-environment-secret",
        PLAYWRIGHT_HTML_OUTPUT_DIR: join(directory, "html"),
        PLAYWRIGHT_HTML_OPEN: "never",
        PLAYWRIGHT_JSON_OUTPUT_FILE: join(directory, "report.json"),
      },
    },
  );
  if (result.error) throw result.error;
  return { directory, result };
}

it("fails a green browser run when the server reports an unhandled rejection", () => {
  const { directory, result } = runScenario("unhandled");
  const browser = JSON.parse(
    readFileSync(join(directory, "report.json"), "utf8"),
  );
  expect(browser.stats.expected).toBe(1);
  expect(browser.stats.unexpected).toBe(0);
  expect(result.status).toBe(1);
  const server = JSON.parse(
    readFileSync(join(directory, "server/report.json"), "utf8"),
  );
  expect(server.browserStatus).toBe("passed");
  expect(server.serverStatus).toBe("failed");
  expect(server.workers).toBe(1);
  expect(server.actualWorkers).toBe(1);
  expect(server.sourceRevision).toMatch(/^[a-f0-9]{40}$/);
  expect(server.runId).toBe(browser.config.metadata.serverDiagnosticsRunId);
  expect(
    readFileSync(join(directory, "server", server.logFile), "utf8"),
  ).toContain("Unhandled Rejection: RuntimeError: Aborted()");
}, 30_000);

it("retains server diagnostics and separates browser/server status in the CI summary", () => {
  const { directory } = runScenario("unhandled");
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
      env: {
        ...process.env,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
      },
    },
  );
  expect(result.status).toBe(0);
  expect(readFileSync(output, "utf8")).toBe("retain=true\n");
  expect(readFileSync(summary, "utf8")).toContain("Serverutfall: **failed**");
  expect(readFileSync(summary, "utf8")).toContain("Direkt godkända: **1**");
}, 30_000);

it.each(["clean", "warning", "negative"])(
  "accepts %s output and preserves clean browser results",
  (scenario) => {
    const { directory, result } = runScenario(scenario);
    expect(result.status).toBe(0);
    const report = JSON.parse(
      readFileSync(join(directory, "server/report.json"), "utf8"),
    );
    expect(report.serverStatus).toBe("passed");
    expect(report.findings).toEqual([]);
    expect(report.workerIndices).toEqual([0]);
  },
  30_000,
);

it.each(["structured", "split", "shutdown", "promise"])(
  "fails on %s server errors, including teardown and incomplete lines",
  (scenario) => {
    const { directory, result } = runScenario(scenario);
    expect(result.status).toBe(1);
    const report = JSON.parse(
      readFileSync(join(directory, "server/report.json"), "utf8"),
    );
    expect(report.browserStatus).toBe("passed");
    expect(report.serverStatus).toBe("failed");
    expect(report.findings).toHaveLength(1);
  },
  30_000,
);

it("preserves startup failure diagnostics when no assertion can run", () => {
  const { directory, result } = runScenario("startup");
  expect(result.status).toBe(1);
  const report = JSON.parse(
    readFileSync(join(directory, "server/report.json"), "utf8"),
  );
  expect(report.browserStatus).toBe("failed");
  expect(report.serverStatus).toBe("failed");
  expect(
    readFileSync(join(directory, "server", report.logFile), "utf8"),
  ).toContain("synthetic startup failure");
}, 30_000);

it("redacts credentials, email addresses and URL parameters before saving logs", () => {
  const { directory, result } = runScenario("redaction");
  expect(result.status).toBe(0);
  const report = JSON.parse(
    readFileSync(join(directory, "server/report.json"), "utf8"),
  );
  const log = readFileSync(join(directory, "server", report.logFile), "utf8");
  expect(log).toContain("[REDACTED]");
  for (const sensitive of [
    "synthetic-credential",
    "synthetic-session",
    "person@example.test",
    "synthetic-query",
    "synthetic-relative-state",
    "synthetic-environment-secret",
    "synthetic:password",
  ])
    expect(log).not.toContain(sensitive);
}, 30_000);

it("fails closed when the diagnostics directory cannot be written", () => {
  const { result } = runScenario("capture-failure");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Serverdiagnostiken kunde inte sparas");
}, 30_000);

it.each(["missing", "mismatched"])(
  "rejects %s server evidence instead of declaring a clean summary",
  (scenario) => {
    const { directory, result } = runScenario("clean");
    expect(result.status).toBe(0);
    const serverFile = join(directory, "server/report.json");
    if (scenario === "missing") rmSync(serverFile);
    else {
      const server = JSON.parse(readFileSync(serverFile, "utf8"));
      server.runId = "stale-run";
      writeFileSync(serverFile, JSON.stringify(server));
    }
    const summary = spawnSync(
      process.execPath,
      [
        ".github/scripts/summarize-playwright.mjs",
        join(directory, "report.json"),
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(summary.status).toBe(1);
  },
  30_000,
);
