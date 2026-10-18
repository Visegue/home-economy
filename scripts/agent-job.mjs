import { spawn } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createReadStream } from "node:fs";
import { constants, tmpdir } from "node:os";
import { join } from "node:path";
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
    "timeout-ms": { type: "string", default: "900000" },
    "quiet-ms": { type: "string", default: "60000" },
  },
});
const timeout = Number(values["timeout-ms"]);
const quiet = Number(values["quiet-ms"]);
const limit = Number(values.limit);
const from = Number(values.from);
const column = Number(values.column);
if (
  ![limit, from, column, timeout, quiet].every(
    (n) => Number.isSafeInteger(n) && n > 0,
  ) ||
  limit > 20000 ||
  timeout > 2147483647 ||
  quiet > 2147483647
)
  throw new Error(
    "Use positive integer bounds; --limit must be at most 20000.",
  );

async function excerpt(directory) {
  const lines = createInterface({
    input: createReadStream(join(directory, "output.log")),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  let remaining = limit;
  let recovery;
  for await (const line of lines) {
    lineNumber++;
    const safe = redact(line);
    if (lineNumber < from || (values.match && !safe.includes(values.match)))
      continue;
    const text = `${lineNumber}: ${safe.slice(lineNumber === from ? column - 1 : 0)}\n`;
    if (text.length > remaining) {
      process.stdout.write(text.slice(0, remaining));
      const offset = lineNumber === from ? column - 1 : 0;
      recovery = {
        line: lineNumber,
        column: offset + Math.max(0, remaining - `${lineNumber}: `.length) + 1,
      };
      break;
    }
    process.stdout.write(text);
    remaining -= text.length;
  }
  lines.close();
  if (recovery)
    console.log(
      `\nTRUNCATED. Recover: read ${directory} --from ${recovery.line} --column ${recovery.column} --limit ${limit}; or use --match <diagnostic>. Full private output.log retained.`,
    );
}

if (mode === "read" && positionals.length === 1) {
  await excerpt(positionals[0]);
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
    "Usage: agent-job.mjs run [--name job] [--limit chars] -- command [args...] | read <evidence> [--from line] [--column char] [--match text] [--limit chars]",
  );
  process.exitCode = 2;
}
