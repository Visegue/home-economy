// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

const script = fileURLToPath(new URL("./agent-job.mjs", import.meta.url));
const roots = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
function fixture(log = "", report) {
  const directory = mkdtempSync(join(tmpdir(), "job-read-"));
  roots.push(directory);
  writeFileSync(join(directory, "output.log"), log);
  if (report !== undefined)
    writeFileSync(join(directory, "result.json"), JSON.stringify(report));
  return directory;
}
function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, ...env },
  });
}

test("reads the final lines with original numbers, blanks and a partial last line", () => {
  const directory = fixture("old diagnostic\n\nlatest\npartial");
  expect(run(["read", directory, "--tail", "3"]).stdout).toBe(
    "2: \n3: latest\n4: partial\n",
  );
  expect(
    run(["read", directory, "--tail", "2", "--match", "old diagnostic"]).stdout,
  ).toBe("");
  expect(
    run([
      "read",
      directory,
      "--tail",
      "3",
      "--from",
      "3",
      "--column",
      "3",
      "--match",
      "latest",
    ]).stdout,
  ).toBe("3: test\n");
  expect(readFileSync(join(directory, "output.log"), "utf8")).toBe(
    "old diagnostic\n\nlatest\npartial",
  );
});

test("an empty tail is a successful empty read", () => {
  const result = run(["read", fixture(), "--tail", "20"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
});

test("bounds and sanitizes long tail lines and recovers beyond the first excerpt", () => {
  const directory = fixture(
    `old\ntest@example.com ${"x".repeat(5000)} final-diagnostic\nlast`,
  );
  const result = run([
    "read",
    directory,
    "--tail",
    "2",
    "--match",
    "final-diagnostic",
    "--limit",
    "256",
  ]);
  expect(result.status).toBe(0);
  expect(result.stdout).not.toContain("test@example.com");
  expect(result.stdout).toContain("REDACTED_EMAIL");
  expect(result.stdout).toContain("TRUNCATED");
  expect(result.stdout.length).toBeLessThan(700);
  const cursor = /--from (\d+) --column (\d+)/.exec(result.stdout);
  const next = run([
    "read",
    directory,
    "--from",
    cursor[1],
    "--column",
    cursor[2],
    "--limit",
    "256",
  ]);
  expect(next.stdout).toContain("2: xxx");
  const nextCursor = /--from (\d+) --column (\d+)/.exec(next.stdout);
  expect(Number(nextCursor[2])).toBeGreaterThan(Number(cursor[2]));
  const recovered = run([
    "read",
    directory,
    "--from",
    cursor[1],
    "--column",
    "4900",
    "--match",
    "final-diagnostic",
    "--limit",
    "256",
  ]);
  expect(recovered.status).toBe(0);
  expect(recovered.stdout).toContain("final-diagnostic");
  expect(recovered.stdout).not.toContain("TRUNCATED");
});

test.each(["0", "1001", "1.5"])("rejects invalid tail bound %s", (tail) => {
  const result = run(["read", fixture(), "--tail", tail]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("between 1 and 1000");
});

test.each([
  ["completed", 0, "complete"],
  ["completed", 7, "complete"],
  ["timeout", 124, "complete"],
  ["cancelled", 130, "complete"],
  ["spawn-error", 127, "complete"],
  ["cleanup-failure", 125, "incomplete"],
  ["cleanup-failure", 125, "complete"],
])(
  "reads final %s/%i status without changing evidence",
  (state, exitCode, cleanup) => {
    const directory = fixture("private evidence", {
      state,
      exitCode,
      cleanup,
      token: "synthetic-secret",
    });
    const before = readFileSync(join(directory, "result.json"), "utf8");
    const result = run(["status", directory]);
    expect(result.status).toBe(exitCode);
    expect(JSON.parse(result.stdout)).toEqual({
      state,
      exitCode,
      cleanup,
      evidence: directory,
    });
    expect(result.stdout).not.toContain("synthetic-secret");
    expect(readFileSync(join(directory, "result.json"), "utf8")).toBe(before);
    expect(readFileSync(join(directory, "output.log"), "utf8")).toBe(
      "private evidence",
    );
  },
);

test.each([
  undefined,
  { state: "running", exitCode: 0, cleanup: "complete" },
  { state: "completed", exitCode: 0, cleanup: "incomplete" },
  { state: "timeout", exitCode: 0, cleanup: "complete" },
  { state: "completed", exitCode: "0", cleanup: "complete" },
  null,
])("never treats unfinished or invalid evidence as success: %j", (report) => {
  const result = run(["status", fixture("", report)]);
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({
    state: "unknown",
    exitCode: null,
    cleanup: "unknown",
  });
});

test("bounds status JSON and sanitizes its evidence path and malformed report", () => {
  const root = fixture();
  const directory = join(
    root,
    "test@example.com",
    "x".repeat(180),
    '"'.repeat(80),
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "result.json"), "token=synthetic-secret");
  const result = run(["status", directory, "--limit", "256"]);
  expect(result.status).toBe(1);
  expect(result.stdout.length).toBeLessThanOrEqual(256);
  expect(JSON.parse(result.stdout)).toMatchObject({
    state: "unknown",
    report: "invalid",
    evidenceTruncated: true,
  });
  expect(result.stdout).not.toContain("test@example.com");
  expect(result.stdout).not.toContain("synthetic-secret");
});
