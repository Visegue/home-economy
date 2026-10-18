import { spawn } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { constants } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Shared by repository entry points that own Next output or generated types.
// Keep a killed owner's lock: an orphaned Next child may still be writing.
export async function withNextOutput(label, command, args) {
  mkdirSync(".tmp", { recursive: true });
  const lock = resolve(".tmp/next-output.lock");
  let descriptor;
  try {
    descriptor = openSync(lock, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner = "okänd ägare";
    try {
      const { label: job, pid } = JSON.parse(readFileSync(lock, "utf8"));
      owner = `${job} (PID ${pid})`;
    } catch {
      /* Another owner may still be writing its identity. */
    }
    console.error(
      `Next-utdata upptagna av ${owner}. Konflikt för ${label}; exit 73. Vänta tills jobbet avslutats och kör igen. Kvarlämnat lås: ${lock}; kontrollera ägare och barnprocesser innan låset tas bort.`,
    );
    return 73;
  }
  try {
    writeFileSync(descriptor, JSON.stringify({ label, pid: process.pid }));
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    const handlers = new Map(
      ["SIGINT", "SIGTERM"].map((signal) => [signal, () => child.kill(signal)]),
    );
    for (const [signal, handler] of handlers) process.on(signal, handler);
    try {
      return await new Promise((resolveExit, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) =>
          resolveExit(code ?? 128 + (constants.signals[signal] ?? 0)),
        );
      });
    } finally {
      for (const [signal, handler] of handlers) process.off(signal, handler);
    }
  } finally {
    closeSync(descriptor);
    unlinkSync(lock);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [, , label, command, ...args] = process.argv;
  if (!label || !command) {
    console.error("Usage: with-next-output.mjs <job> <command> [args...]");
    process.exitCode = 2;
  } else {
    process.exitCode = await withNextOutput(label, command, args);
  }
}
