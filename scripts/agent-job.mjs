import { spawn } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createReadStream } from "node:fs";
import { constants, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { redact } from "./redact-output.mjs";

const [mode, ...args] = process.argv.slice(2);
const { values, positionals } = parseArgs({
  args,
  allowPositionals: true,
  options: {
    name: { type: "string", default: "verification" },
    limit: { type: "string", default: "4000" },
    from: { type: "string", default: "1" },
    column: { type: "string", default: "1" },
    match: { type: "string" },
    tail: { type: "string" },
    "timeout-ms": { type: "string", default: "900000" },
    "quiet-ms": { type: "string", default: "60000" },
  },
});
const timeout = Number(values["timeout-ms"]);
const quiet = Number(values["quiet-ms"]);
const limit = Number(values.limit);
const from = Number(values.from);
const column = Number(values.column);
const tail = values.tail === undefined ? undefined : Number(values.tail);
if (
  ![limit, from, column, timeout, quiet].every(
    (n) => Number.isSafeInteger(n) && n > 0,
  ) ||
  limit < 256 ||
  limit > 20000 ||
  timeout > 2147483647 ||
  quiet > 2147483647 ||
  (tail !== undefined &&
    (!Number.isSafeInteger(tail) || tail < 1 || tail > 1000 || mode !== "read"))
)
  throw new Error(
    "Use positive integer bounds; --limit must be between 256 and 20000; --tail is read-only and must be between 1 and 1000.",
  );

async function* selectedLines(directory) {
  const input = createReadStream(join(directory, "output.log"));
  const lines = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  const recent = [];
  try {
    for await (const line of lines) {
      lineNumber++;
      const safe = redact(line);
      const offset = lineNumber === from ? column - 1 : 0;
      const entry = {
        lineNumber,
        offset,
        safe: safe.slice(offset, offset + limit + 1),
        matches: !values.match || safe.includes(values.match),
      };
      if (tail === undefined) yield entry;
      else {
        if (recent.length === tail) recent.shift();
        recent.push(entry);
      }
    }
    yield* recent;
  } finally {
    lines.close();
    input.destroy();
  }
}

async function excerpt(directory) {
  let remaining = limit;
  let recovery;
  for await (const { lineNumber, safe, matches, offset } of selectedLines(
    directory,
  )) {
    if (lineNumber < from || !matches) continue;
    const text = `${lineNumber}: ${safe}\n`;
    if (text.length > remaining) {
      process.stdout.write(text.slice(0, remaining));
      recovery = {
        line: lineNumber,
        column: offset + Math.max(0, remaining - `${lineNumber}: `.length) + 1,
      };
      break;
    }
    process.stdout.write(text);
    remaining -= text.length;
  }
  if (recovery)
    console.log(
      `\nTRUNCATED. Recover: read ${directory} --from ${recovery.line} --column ${recovery.column} --limit ${limit}; or use --match <diagnostic>. Full private output.log retained.`,
    );
}

function status(directory) {
  const summary = {
    state: "unknown",
    exitCode: null,
    cleanup: "unknown",
    evidence: redact(resolve(directory)),
  };
  let code = 1;
  try {
    const path = join(directory, "result.json");
    if (statSync(path).size > 65536) throw new Error("Invalid report");
    const report = JSON.parse(readFileSync(path, "utf8"));
    const expected = {
      completed: (code) => Number.isInteger(code) && code >= 0 && code <= 255,
      timeout: (code) => code === 124,
      cancelled: (code) => code === 130 || code === 143,
      "spawn-error": (code) => code === 127,
      "cleanup-failure": (code) => code === 125,
    };
    if (
      !Object.hasOwn(expected, report?.state) ||
      !expected[report.state](report.exitCode) ||
      !["complete", "incomplete"].includes(report.cleanup) ||
      (report.cleanup === "incomplete" && report.state !== "cleanup-failure")
    )
      throw new Error("Invalid report");
    Object.assign(summary, {
      state: report.state,
      exitCode: report.exitCode,
      cleanup: report.cleanup,
    });
    code = report.exitCode;
  } catch (error) {
    summary.report = error.code === "ENOENT" ? "missing" : "invalid";
  }
  if (JSON.stringify(summary).length + 1 > limit) {
    summary.evidenceTruncated = true;
    while (JSON.stringify(summary).length + 1 > limit)
      summary.evidence = summary.evidence.slice(0, -1);
  }
  console.log(JSON.stringify(summary));
  process.exitCode = code;
}

if (mode === "status" && positionals.length === 1) {
  status(positionals[0]);
} else if (mode === "read" && positionals.length === 1) {
  try {
    await excerpt(positionals[0]);
  } catch {
    console.error("Could not read private output.log.");
    process.exitCode = 1;
  }
} else if (mode === "run" && positionals.length) {
  const directory = mkdtempSync(join(tmpdir(), "home-economy-job-"));
  const fd = openSync(join(directory, "output.log"), "wx", 0o600);
  const startedAt = new Date().toISOString();
  if (process.platform === "win32")
    throw new Error("Owned process groups require a POSIX host.");
  const child = spawn(positionals[0], positionals.slice(1), {
    stdio: ["ignore", fd, fd],
    detached: true,
  });
  const groupExists = () => {
    if (!child.pid) return false;
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch (error) {
      if (error.code === "ESRCH") return false;
      throw error;
    }
  };
  const signalGroup = (signal) => {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  let stopped;
  let force;
  function stop(state, exitCode) {
    if (stopped) return;
    stopped = { state, exitCode };
    console.log(`Stopping owned group ${child.pid}: ${state}`);
    signalGroup("SIGTERM");
    force = setTimeout(() => signalGroup("SIGKILL"), 1000);
  }
  const handlers = new Map([
    ["SIGINT", () => stop("cancelled", 130)],
    ["SIGTERM", () => stop("cancelled", 143)],
  ]);
  for (const [signal, handler] of handlers) process.on(signal, handler);
  const deadline = setTimeout(() => stop("timeout", 124), timeout);
  let lastSize = 0;
  let lastActivity = Date.now();
  let quietReported = false;
  const activity = setInterval(
    () => {
      const size = statSync(join(directory, "output.log")).size;
      if (size !== lastSize) {
        lastActivity = Date.now();
        lastSize = size;
        quietReported = false;
      }
      if (!quietReported && Date.now() - lastActivity >= quiet) {
        console.log(
          `QUIET: owned group ${child.pid}; still running, deadline ${new Date(Date.parse(startedAt) + timeout).toISOString()}. Inspect evidence; wait or signal runner PID ${process.pid}.`,
        );
        quietReported = true;
      }
    },
    Math.min(quiet, 1000),
  );
  console.log(
    `Job: ${redact(values.name)}; runner PID ${process.pid}; child/group PID ${child.pid ?? "unavailable"}; deadline ${new Date(Date.parse(startedAt) + timeout).toISOString()}`,
  );
  console.log(`Evidence: ${directory}`);
  const outcome = await new Promise((resolve) => {
    child.once("error", () => resolve({ state: "spawn-error", exitCode: 127 }));
    child.once("close", (code, signal) =>
      resolve({
        state: "completed",
        exitCode: code ?? 128 + (constants.signals[signal] ?? 0),
        signal,
      }),
    );
  });
  clearTimeout(deadline);
  clearInterval(activity);
  // Even a successful parent can leave children behind. Account for the entire
  // group before reporting completion or letting an alternative start.
  const leftovers = groupExists();
  if (leftovers) signalGroup("SIGTERM");
  const cleanupDeadline = Date.now() + 2000;
  while (groupExists() && Date.now() < cleanupDeadline) {
    if (Date.now() >= cleanupDeadline - 1000) signalGroup("SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  clearTimeout(force);
  for (const [signal, handler] of handlers) process.off(signal, handler);
  const cleanup = groupExists() ? "incomplete" : "complete";
  const result = {
    ...outcome,
    ...stopped,
    commandExitCode: outcome.exitCode,
    commandState: outcome.state,
    cleanup,
  };
  if (cleanup !== "complete" || (leftovers && !stopped)) {
    result.state = "cleanup-failure";
    result.exitCode = 125;
  }
  closeSync(fd);
  writeFileSync(
    join(directory, "result.json"),
    JSON.stringify({
      ...result,
      startedAt,
      endedAt: new Date().toISOString(),
      pid: child.pid,
      runnerPid: process.pid,
    }),
    { mode: 0o600 },
  );
  await excerpt(directory);
  console.log(`Result: ${result.state}; exit ${result.exitCode}`);
  process.exitCode = result.exitCode;
} else {
  console.error(
    "Usage: agent-job.mjs run [--name job] [--limit chars] -- command [args...] | read <evidence> [--tail lines] [--from line] [--column char] [--match text] [--limit chars] | status <evidence> [--limit chars]",
  );
  process.exitCode = 2;
}
