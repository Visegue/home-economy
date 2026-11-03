import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pinLocalTools, resolveLocalTools } from "./local-tools.mjs";

if (process.argv.length === 3 && process.argv[2] === "--bootstrap-probe")
  process.exit(typeof process.execve === "function" ? 0 : 1);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function quote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
let pinned;
let interrupted;
const handlers = new Map([
  [
    "SIGINT",
    () => {
      interrupted = 130;
    },
  ],
  [
    "SIGTERM",
    () => {
      interrupted = 143;
    },
  ],
]);
for (const [signal, handler] of handlers) process.on(signal, handler);
try {
  if (process.argv.length !== 2)
    throw new Error("Använd scripts/verify-local utan argument.");
  process.chdir(root);
  const tools = resolveLocalTools(root);
  await new Promise((done) => setImmediate(done));
  if (interrupted) {
    process.exitCode = interrupted;
  } else {
    pinned = pinLocalTools(tools);
    // Hand ownership to the shell instead of retaining an extra JS supervisor.
    const plan = `set -e
verify_tools=${quote(pinned.directory)}
verify_child=
verify_interrupted=
trap 'rm -rf "$verify_tools"' 0
on_signal() {
  verify_interrupted=$1
  trap '' INT TERM
  if [ -n "$verify_child" ]; then kill -s "$2" "$verify_child" 2>/dev/null || true; fi
}
trap 'on_signal 130 INT' INT
trap 'on_signal 143 TERM' TERM
run() {
  if [ -n "$verify_interrupted" ]; then return "$verify_interrupted"; fi
  "$@" &
  verify_child=$!
  verify_code=0
  wait "$verify_child" || verify_code=$?
  if [ -n "$verify_interrupted" ]; then
    wait "$verify_child" 2>/dev/null || true
    verify_code=$verify_interrupted
  fi
  verify_child=
  return "$verify_code"
}
cd ${quote(root)}
printf '%s\\n' ${quote(`Lokal verifiering: ${root}`)}
run bun scripts/check-local-environment.mjs
run bun scripts/agent-job.mjs run --name verify-check --timeout-ms 900000 --quiet-ms 60000 -- pnpm check
run bun scripts/agent-job.mjs run --name verify-e2e --timeout-ms 900000 --quiet-ms 60000 -- pnpm test:e2e
`;
    process.execve("/bin/sh", ["sh", "-c", plan], pinned.env);
  }
} catch (error) {
  await new Promise((done) => setImmediate(done));
  pinned?.dispose();
  if (!interrupted)
    console.error(
      error.message.startsWith("node:") ||
        error.message.startsWith("bun:") ||
        error.message.startsWith("pnpm:") ||
        error.message.startsWith("Använd") ||
        error.message.startsWith("Ogiltig runtime")
        ? error.message
        : "Lokal verifiering kunde inte starta. Kontrollera installation och skrivbehörighet enligt docs/testing.md.",
    );
  process.exitCode = interrupted ?? 1;
} finally {
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
