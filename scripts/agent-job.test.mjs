// @vitest-environment node
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const script = fileURLToPath(new URL("./agent-job.mjs", import.meta.url));
function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout: 10000,
  });
}
test("bounds displayed output, recovers omitted evidence and preserves the command failure", () => {
  const result = run([
    "run",
    "--name",
    "synthetic-failure",
    "--limit",
    "500",
    "--",
    process.execPath,
    "-e",
    'console.log("first diagnostic"); console.log("x".repeat(4000)); console.error("last diagnostic"); process.exit(7)',
  ]);
  expect(result.status).toBe(7);
  expect(result.stdout).toContain("TRUNCATED");
  expect(result.stdout.length).toBeLessThan(2000);
  const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
  expect(directory).toBeTruthy();
  try {
    expect(readFileSync(`${directory}/output.log`, "utf8")).toContain(
      "last diagnostic",
    );
    const recovered = run(["read", directory, "--match", "last diagnostic"]);
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain("last diagnostic");
    expect(
      JSON.parse(readFileSync(`${directory}/result.json`, "utf8")),
    ).toMatchObject({
      state: "completed",
      exitCode: 7,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reports a quiet blocked job, ends it at its deadline and records a final timeout", () => {
  const result = run([
    "run",
    "--timeout-ms",
    "500",
    "--quiet-ms",
    "100",
    "--",
    process.execPath,
    "-e",
    "setInterval(() => {}, 1000)",
  ]);
  expect(result.status).toBe(124);
  expect(result.stdout).toContain("QUIET");
  const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
  try {
    const report = JSON.parse(readFileSync(`${directory}/result.json`, "utf8"));
    expect(report).toMatchObject({
      state: "timeout",
      exitCode: 124,
      cleanup: "complete",
    });
    expect(() => process.kill(report.pid, 0)).toThrow(/ESRCH/);
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("timeout removes an owned TERM-resistant descendant and leaves another job alive", () => {
  const unrelated = spawn(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)"],
    { stdio: "ignore" },
  );
  let directory;
  try {
    const result = run([
      "run",
      "--timeout-ms",
      "500",
      "--quiet-ms",
      "100",
      "--",
      process.execPath,
      "--input-type=module",
      "-e",
      `import { spawn } from 'node:child_process';
       spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); console.log("descendant=" + process.pid); setInterval(() => {}, 1000)'], {stdio: 'inherit'});
       setInterval(() => {}, 1000);`,
    ]);
    expect(result.status).toBe(124);
    directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
    const pid = Number(
      /descendant=(\d+)/.exec(
        readFileSync(`${directory}/output.log`, "utf8"),
      )?.[1],
    );
    expect(pid).toBeGreaterThan(1);
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
    expect(() => process.kill(unrelated.pid, 0)).not.toThrow(/ESRCH/);
  } finally {
    unrelated.kill("SIGKILL");
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("sanitizes recovered diagnostics without changing private full evidence", () => {
  const result = run([
    "run",
    "--",
    process.execPath,
    "-e",
    'console.log("postgres://user:password@host/db test@example.com token=synthetic-secret")',
  ]);
  const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
  try {
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("synthetic-secret");
    expect(result.stdout).not.toContain("test@example.com");
    const recovered = run(["read", directory]);
    expect(recovered.stdout).toContain("REDACTED");
    expect(recovered.stdout).not.toContain("user:password");
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("preserves a spawn failure rather than reporting a successful empty log", () => {
  const result = run(["run", "--", "/no-such-home-economy-command"]);
  const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
  try {
    expect(result.status).toBe(127);
    expect(result.stdout).toContain("spawn-error");
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("SIGINT to the runner waits for its owned job and preserves cancellation status", async () => {
  const child = spawn(
    process.execPath,
    [
      script,
      "run",
      "--",
      process.execPath,
      "-e",
      "setInterval(() => {}, 1000)",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  let cancelled = false;
  child.stdout.on("data", (chunk) => {
    output += chunk;
    if (!cancelled && output.includes("Evidence:")) {
      cancelled = true;
      child.kill("SIGINT");
    }
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  let directory;
  try {
    const code = await new Promise((resolve) => child.once("close", resolve));
    directory = /Evidence: (.+)/.exec(output)?.[1];
    expect(code).toBe(130);
    const report = JSON.parse(readFileSync(`${directory}/result.json`, "utf8"));
    expect(report).toMatchObject({
      state: "cancelled",
      exitCode: 130,
      cleanup: "complete",
    });
    expect(() => process.kill(report.pid, 0)).toThrow(/ESRCH/);
  } finally {
    clearTimeout(timer);
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("preserves the conventional exit status when the command dies from SIGKILL", () => {
  const result = run([
    "run",
    "--",
    process.execPath,
    "-e",
    'process.kill(process.pid, "SIGKILL")',
  ]);
  const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
  try {
    expect(result.status).toBe(137);
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects a tiny excerpt budget with a useful bound before starting a job", () => {
  const result = run([
    "run",
    "--limit",
    "1",
    "--",
    process.execPath,
    "-e",
    'console.log("diagnostic")',
  ]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("256");
  expect(result.stdout).not.toContain("Evidence:");
});

test.each([
  { denied: 0, timeout: false },
  { denied: 0, timeout: true },
  { denied: "SIGTERM", timeout: true },
  { denied: "SIGKILL", timeout: true },
  { denied: "signals", timeout: true },
])(
  "preserves a final report when process control is denied: $denied, timeout=$timeout",
  ({ denied, timeout }) => {
    // Inject only into the runner, never into the command or the test process.
    const preload = `const kill = process.kill.bind(process);
    process.kill = (pid, signal) => {
      if (pid < 0 && (signal === ${JSON.stringify(denied)} || (${JSON.stringify(denied)} === 'signals' && signal !== 0))) {
        const error = new Error('synthetic private diagnostic');
        error.code = 'EPERM'; throw error;
      }
      return kill(pid, signal);
    };`;
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        `data:text/javascript,${encodeURIComponent(preload)}`,
        script,
        "run",
        "--timeout-ms",
        timeout ? "300" : "5000",
        "--",
        process.execPath,
        "-e",
        denied === "signals"
          ? "setInterval(() => {}, 1000)"
          : timeout
            ? 'process.on("SIGTERM", () => {}); setTimeout(() => process.exit(7), 1800)'
            : "process.exit(7)",
      ],
      { encoding: "utf8", timeout: 10000 },
    );
    const directory = /Evidence: (.+)/.exec(result.stdout)?.[1];
    let report;
    try {
      expect(result.status).toBe(125);
      report = JSON.parse(readFileSync(`${directory}/result.json`, "utf8"));
      expect(report).toMatchObject({
        state: "cleanup-failure",
        exitCode: 125,
        cleanup: "incomplete",
        commandState: denied === "signals" ? "unknown" : "completed",
        processErrors:
          denied === "signals"
            ? [
                { operation: "signal", signal: "SIGTERM", code: "EPERM" },
                { operation: "signal", signal: "SIGKILL", code: "EPERM" },
              ]
            : [
                {
                  operation: denied === 0 ? "probe" : "signal",
                  signal: denied,
                  code: "EPERM",
                },
              ],
      });
      expect(report.commandExitCode).toBe(
        denied === "signals"
          ? null
          : !timeout || denied === "SIGKILL"
            ? 7
            : 137,
      );
      expect(report.stopReason).toEqual(
        timeout ? { state: "timeout", exitCode: 124 } : undefined,
      );
      expect(result.stderr).not.toContain("synthetic private diagnostic");
      expect(run(["status", directory]).status).toBe(125);
    } finally {
      // This test alone owns the intentionally unsignalable job; the runner
      // correctly reports it as incomplete. The injection is not active here.
      const ownedPid = Number(
        /child\/group PID (\d+)/.exec(result.stdout)?.[1],
      );
      if (denied === "signals" && ownedPid > 1) {
        process.kill(-ownedPid, "SIGKILL");
      }
      if (directory) rmSync(directory, { recursive: true, force: true });
    }
  },
  10000,
);
