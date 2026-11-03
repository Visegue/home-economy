// @vitest-environment node
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });
const source = dirname(fileURLToPath(import.meta.url));
const roots = [];
const evidence = [];
afterEach(() => {
  for (const root of [...roots.splice(0), ...evidence.splice(0)])
    rmSync(root, { recursive: true, force: true });
});
function quote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
function executable(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { mode: 0o755 });
}
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "local verify-'")));
  roots.push(root);
  const scripts = join(root, "scripts");
  mkdirSync(scripts);
  for (const name of [
    "verify-local",
    "verify-local.mjs",
    "local-tools.mjs",
    "agent-job.mjs",
    "redact-output.mjs",
  ])
    copyFileSync(join(source, name), join(scripts, name));
  writeFileSync(join(root, ".tool-versions"), "node 24\nbun 1.3.14\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      engines: { node: "24.x" },
      packageManager: "pnpm@11.24.0",
    }),
  );
  const bin = join(root, "bin");
  const mise = join(root, "installed");
  executable(
    join(bin, "node"),
    `#!/bin/sh\nif [ "$1" = '--version' ]; then echo v26.0.0; else exec ${quote(process.execPath)} "$@"; fi\n`,
  );
  executable(
    join(bin, "pnpm"),
    "#!/bin/sh\necho wrong-pnpm-in-PATH >&2\nexit 9\n",
  );
  executable(
    join(mise, "installs/node/24.21.0/bin/node"),
    `#!/bin/sh\nif [ "$1" = '--version' ]; then echo v24.21.0; else exec ${quote(process.execPath)} "$@"; fi\n`,
  );
  executable(
    join(mise, "installs/bun/1.3.14/bin/bun"),
    `#!/bin/sh\nif [ "$1" = '--version' ]; then echo 1.3.14; else exec ${quote(process.execPath)} "$@"; fi\n`,
  );
  const cache = join(root, "corepack");
  const pnpm = join(cache, "v1/pnpm/11.24.0/bin/pnpm.mjs");
  executable(
    pnpm,
    `
import { appendFileSync } from 'node:fs';
if (process.argv[2] === '--version') console.log('11.24.0');
else {
 appendFileSync(process.env.VERIFY_TEST_EVENTS, JSON.stringify({stage:process.argv[2],cwd:process.cwd(),node:process.version,deps:process.env.PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN,offline:process.env.COREPACK_ENABLE_NETWORK})+'\\n');
 if(process.argv[2]==='check' && process.env.VERIFY_TEST_HANG==='1') setInterval(()=>{},1000);
 else process.exitCode=process.argv[2]==='check'?Number(process.env.VERIFY_TEST_EXIT || 0):0;
}
`,
  );
  writeFileSync(
    join(scripts, "check-local-environment.mjs"),
    `
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const tools=Object.fromEntries(['node','bun','pnpm'].map(name=>[name,execFileSync(name,['--version'],{encoding:'utf8'}).trim()]));
appendFileSync(process.env.VERIFY_TEST_EVENTS,JSON.stringify({stage:'preflight',cwd:process.cwd(),tools,path:process.env.PATH,deps:process.env.PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN,offline:process.env.COREPACK_ENABLE_NETWORK})+'\\n');
process.exitCode=Number(process.env.VERIFY_TEST_PREFLIGHT_EXIT || 0);
`,
  );
  const events = join(root, "events.jsonl");
  return {
    root,
    entry: join(scripts, "verify-local"),
    mise,
    cache,
    pnpm,
    events,
    env: {
      ...process.env,
      HOME: root,
      MISE_DATA_DIR: mise,
      COREPACK_HOME: cache,
      PATH: `${bin}:/usr/bin:/bin`,
      VERIFY_TEST_EVENTS: events,
    },
  };
}
function recordEvidence(output) {
  evidence.push(
    ...[...output.matchAll(/Evidence: (.+)/g)].map((match) => match[1]),
  );
}
function run(f, extra = {}) {
  const result = spawnSync("/bin/sh", [f.entry], {
    cwd: tmpdir(),
    env: { ...f.env, ...extra },
    encoding: "utf8",
    timeout: 10000,
  });
  recordEvidence(result.stdout);
  return result;
}
function events(f) {
  return existsSync(f.events)
    ? readFileSync(f.events, "utf8").trim().split("\n").map(JSON.parse)
    : [];
}

test("selects installed tools despite wrong PATH and runs real job boundaries sequentially in its own worktree", () => {
  const f = fixture();
  const result = run(f);
  expect(result.status).toBe(0);
  const rows = events(f);
  expect(rows.map((row) => row.stage)).toEqual([
    "preflight",
    "check",
    "test:e2e",
  ]);
  expect(
    rows.every(
      (row) =>
        row.cwd === f.root && row.offline === "0" && row.deps === "error",
    ),
  ).toBe(true);
  expect(rows[0].tools).toEqual({
    node: "v24.21.0",
    bun: "1.3.14",
    pnpm: "11.24.0",
  });
  expect(rows.slice(1).every((row) => row.node.startsWith("v24."))).toBe(true);
  expect(existsSync(rows[0].path.split(":")[0])).toBe(false);
  expect(result.stderr).not.toContain("wrong-pnpm-in-PATH");
  expect(result.stdout.match(/Result: completed; exit 0/g)).toHaveLength(2);
});

test.each(["broken", "stalled"])(
  "bootstraps past a %s first runtime in PATH",
  (kind) => {
    const f = fixture();
    executable(
      join(f.root, "bin", "node"),
      kind === "broken"
        ? "#!/bin/sh\nexit 9\n"
        : `#!${process.execPath}\nsetInterval(()=>{},1000);\n`,
    );
    const result = run(f);
    expect(result.status).toBe(0);
    expect(events(f).map((row) => row.stage)).toEqual([
      "preflight",
      "check",
      "test:e2e",
    ]);
  },
);

test.each(["bun", "pnpm"])(
  "fails before preflight when compatible %s is absent",
  (name) => {
    const f = fixture();
    rmSync(name === "bun" ? join(f.mise, "installs/bun") : f.cache, {
      recursive: true,
    });
    const result = run(f);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `${name}: ingen kompatibel installerad version`,
    );
    expect(result.stderr).not.toContain("wrong-pnpm-in-PATH");
    expect(events(f)).toEqual([]);
    expect(result.stdout).not.toContain("Evidence:");
  },
);

test("uses configured versions rather than accepting an incompatible cached package manager", () => {
  const f = fixture();
  writeFileSync(
    join(f.root, "package.json"),
    JSON.stringify({
      engines: { node: "24.x" },
      packageManager: "pnpm@12.0.0",
    }),
  );
  const result = run(f);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "pnpm: ingen kompatibel installerad version (12.0.0)",
  );
  expect(events(f)).toEqual([]);
});

test("retains a failed preflight and starts no verification jobs", () => {
  const f = fixture();
  const result = run(f, { VERIFY_TEST_PREFLIGHT_EXIT: "7" });
  expect(result.status).toBe(7);
  expect(events(f).map((row) => row.stage)).toEqual(["preflight"]);
  expect(result.stdout).not.toContain("Evidence:");
});

test("retains check failure and skips E2E", () => {
  const f = fixture();
  const result = run(f, { VERIFY_TEST_EXIT: "7" });
  expect(result.status).toBe(7);
  expect(events(f).map((row) => row.stage)).toEqual(["preflight", "check"]);
  expect(result.stdout).toContain("Result: completed; exit 7");
});

test("bounds a stalled version candidate before selecting an installed replacement", () => {
  const f = fixture();
  executable(
    join(f.root, "bin", "pnpm"),
    `#!${process.execPath}\nsetInterval(()=>{},1000);\n`,
  );
  const result = run(f);
  expect(result.status).toBe(0);
  expect(events(f).map((row) => row.stage)).toEqual([
    "preflight",
    "check",
    "test:e2e",
  ]);
});

test.each([
  ["SIGINT", 130],
  ["SIGTERM", 143],
])(
  "forwards %s to the owned runner, preserves %i and does not start E2E",
  async (signal, code) => {
    const f = fixture();
    const child = spawn("/bin/sh", [f.entry], {
      cwd: tmpdir(),
      env: { ...f.env, VERIFY_TEST_HANG: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    const closed = new Promise((resolve) => child.once("close", resolve));
    const fallback = setTimeout(() => child.kill(signal), 8000);
    try {
      await vi.waitFor(
        () => expect(events(f).some((row) => row.stage === "check")).toBe(true),
        { timeout: 5000 },
      );
      child.kill(signal);
      expect(await closed).toBe(code);
      expect(events(f).map((row) => row.stage)).toEqual(["preflight", "check"]);
      expect(output).toContain(`Result: cancelled; exit ${code}`);
      expect(existsSync(events(f)[0].path.split(":")[0])).toBe(false);
    } finally {
      clearTimeout(fallback);
      child.kill("SIGINT");
      recordEvidence(output);
    }
  },
);

test("cancels during bounded discovery without starting verification or leaving the probe alive", async () => {
  const f = fixture();
  executable(
    join(f.root, "bin", "pnpm"),
    `#!${process.execPath}\nimport {appendFileSync} from 'node:fs';appendFileSync(${JSON.stringify(f.events)},JSON.stringify({stage:'probe',pid:process.pid})+String.fromCharCode(10));setInterval(()=>{},1000);\n`,
  );
  const child = spawn("/bin/sh", [f.entry], {
    cwd: tmpdir(),
    env: f.env,
    stdio: "ignore",
  });
  const closed = new Promise((resolve) => child.once("close", resolve));
  const fallback = setTimeout(() => child.kill("SIGKILL"), 8000);
  try {
    await vi.waitFor(() => expect(events(f)[0]?.stage).toBe("probe"), {
      timeout: 5000,
    });
    const pid = events(f)[0].pid;
    child.kill("SIGINT");
    expect(await closed).toBe(130);
    expect(events(f).map((row) => row.stage)).toEqual(["probe"]);
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
  } finally {
    clearTimeout(fallback);
    child.kill("SIGINT");
  }
});
