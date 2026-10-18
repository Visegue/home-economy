// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { afterEach, expect, test, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });

// Agreed seam (#107): CLI exit status/output with real process/filesystem boundaries.
const script = fileURLToPath(
  new URL("./check-local-environment.mjs", import.meta.url),
);
const roots = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "local-environment-"));
  roots.push(root);
  mkdirSync(join(root, "bin"));
  writeFileSync(join(root, ".tool-versions"), "node 24\nbun 1.3.14\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      engines: { node: "24.x" },
      packageManager: "pnpm@11.24.0",
    }),
  );
  return root;
}
function run(root, extraEnv = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env: { PATH: join(root, "bin"), ...extraEnv },
    encoding: "utf8",
    timeout: 15000,
  });
}
test("reports missing Node before a long verification job", () => {
  const result = run(fixture());
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("Node: saknas");
  expect(result.stdout).toContain(".tool-versions");
});

function tool(root, name, body) {
  writeFileSync(join(root, "bin", name), `#!${process.execPath}\n${body}\n`, {
    mode: 0o755,
  });
}
function versions(root) {
  for (const [name, version] of [
    ["node", "24.16.0"],
    ["bun", "1.3.14"],
    ["pnpm", "11.24.0"],
  ]) {
    tool(
      root,
      name,
      name === "node"
        ? `const {spawnSync} = require("node:child_process"); if (process.argv[2] === "--version") console.log("24.16.0"); else { const r = spawnSync(${JSON.stringify(process.execPath)}, process.argv.slice(2), {stdio:"inherit"}); process.exitCode = r.status ?? 1; }`
        : `console.log(${JSON.stringify(version)})`,
    );
  }
}
test.each(["bun", "pnpm"])("reports missing %s with a next step", (name) => {
  const root = fixture();
  versions(root);
  rmSync(join(root, "bin", name));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain(`${name === "bun" ? "Bun" : "pnpm"}: saknas`);
  expect(result.stdout).toContain("PATH");
});
test.each([
  ["node", "26.0.0", "Node"],
  ["bun", "1.2.0", "Bun"],
  ["pnpm", "11.9.0", "pnpm"],
])("rejects unsupported %s version", (name, version, label) => {
  const root = fixture();
  versions(root);
  tool(root, name, `console.log(${JSON.stringify(version)})`);
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain(`${label}: fel version ${version}`);
});
test.each([
  ["process.exit(7)", "misslyckades"],
  ["setInterval(() => {}, 1000)", "timeout"],
  ['console.log("SECRET-not-a-version")', "ogiltigt versionssvar"],
])("bounds and sanitizes failed version lookup: %s", (body, reason) => {
  const root = fixture();
  versions(root);
  tool(root, "pnpm", body);
  const start = Date.now();
  const result = run(root, { PRIVATE_SECRET: "SECRET" });
  expect(result.status).toBe(1);
  expect(result.stdout).toContain(`pnpm: ${reason}`);
  expect(result.stdout).not.toContain("SECRET");
  expect(Date.now() - start).toBeLessThan(7000);
});
test("uses configured versions and disables package-manager downloads", () => {
  const root = fixture();
  versions(root);
  writeFileSync(join(root, ".tool-versions"), "node 24\nbun 1.4.0\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      engines: { node: "24.x" },
      packageManager: "pnpm@12.0.0",
    }),
  );
  tool(root, "bun", 'console.log("1.4.0")');
  tool(
    root,
    "pnpm",
    'console.log(process.env.COREPACK_ENABLE_NETWORK === "0" && process.env.npm_config_manage_package_manager_versions === "false" && process.env.MISE_AUTO_INSTALL === "false" && process.env.MISE_OFFLINE === "true" ? "12.0.0" : "11.9.0")',
  );
  const result = run(root);
  expect(result.stdout).toContain("Node: OK 24.16.0");
  expect(result.stdout).toContain("Bun: OK 1.4.0");
  expect(result.stdout).toContain("pnpm: OK 12.0.0");
});

const require = createRequire(import.meta.url);
const testDirectory = dirname(require.resolve("@playwright/test/package.json"));
const playwrightRequire = createRequire(require.resolve("@playwright/test"));
const coreRequire = createRequire(playwrightRequire.resolve("playwright"));
const coreDirectory = dirname(
  coreRequire.resolve("playwright-core/package.json"),
);
const browserSpec = JSON.parse(
  readFileSync(join(coreDirectory, "browsers.json"), "utf8"),
).browsers.find((browser) => browser.name === "chromium-headless-shell");
function browserFixture() {
  const root = fixture();
  versions(root);
  mkdirSync(join(root, "node_modules", "@playwright"), { recursive: true });
  symlinkSync(
    testDirectory,
    join(root, "node_modules", "@playwright", "test"),
    "dir",
  );
  const cache = join(root, "browsers");
  const query = spawnSync(
    process.execPath,
    [
      "-e",
      `console.log(require(${JSON.stringify(join(coreDirectory, "lib/coreBundle.js"))}).registry.registry.findExecutable("chromium-headless-shell").executablePath())`,
    ],
    { env: { PLAYWRIGHT_BROWSERS_PATH: cache }, encoding: "utf8" },
  );
  if (query.status !== 0)
    throw new Error("Browser fixture could not resolve installed Playwright");
  return { root, cache, executable: query.stdout.trim() };
}
function browser(executable, version) {
  mkdirSync(dirname(executable), { recursive: true });
  writeFileSync(
    executable,
    `#!${process.execPath}\nconsole.log("Chromium ${version}");\n`,
    { mode: 0o755 },
  );
}
test.each(["supported", "missing", "mismatch", "override"])(
  "checks actual headless browser: %s",
  (mode) => {
    const { root, cache, executable } = browserFixture();
    if (mode !== "missing")
      browser(
        executable,
        mode === "mismatch" ? "999.0.0.0" : browserSpec.browserVersion,
      );
    const override = join(root, "custom chrome");
    if (mode === "override") browser(override, "154.0.0.0");
    const result = run(root, {
      PLAYWRIGHT_BROWSERS_PATH: cache,
      ...(mode === "override"
        ? { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: override }
        : {}),
    });
    expect(result.status).toBe(
      mode === "supported" || mode === "override" ? 0 : 1,
    );
    expect(result.stdout).toContain(
      mode === "missing"
        ? "Browser: saknas"
        : mode === "mismatch"
          ? "Browser: versionskonflikt"
          : "Browser: OK",
    );
    expect(result.stdout).toContain(
      mode === "override" ? "explicit override" : "chromium-headless-shell",
    );
    expect(result.stdout).not.toContain(root);
  },
);

test("reports restricted build-output write permission with an explicit next step", () => {
  const { root, cache, executable } = browserFixture();
  browser(executable, browserSpec.browserVersion);
  mkdirSync(join(root, ".next"));
  chmodSync(join(root, ".next"), 0o555);
  try {
    const result = run(root, { PLAYWRIGHT_BROWSERS_PATH: cache });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Skrivbehörighet: nekad");
    expect(result.stdout).toContain("skrivbart worktree");
    expect(result.stdout).not.toContain(root);
  } finally {
    chmodSync(join(root, ".next"), 0o755);
  }
});

// Additional regression coverage for the shared bounded-probe behavior.
test.each([
  ["missing", "saknas"],
  ["failure", "misslyckades"],
  ["timeout", "timeout"],
  ["invalid", "ogiltigt versionssvar"],
])(
  "does not fall back from a broken explicit browser override: %s",
  (mode, reason) => {
    const { root, cache, executable } = browserFixture();
    browser(executable, browserSpec.browserVersion);
    const override = join(root, "custom-browser");
    if (mode !== "missing")
      writeFileSync(
        override,
        `#!${process.execPath}\n${mode === "failure" ? "process.exit(7)" : mode === "timeout" ? "setInterval(() => {}, 1000)" : 'console.log("SECRET")'}\n`,
        { mode: 0o755 },
      );
    const result = run(root, {
      PLAYWRIGHT_BROWSERS_PATH: cache,
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: override,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`Browser: ${reason}`);
    expect(result.stdout).toContain("explicit override");
    expect(result.stdout).not.toContain("SECRET");
    expect(result.stdout).not.toContain(root);
  },
);

test("accepts an executable macOS Chrome bundle without starting its browser process", () => {
  const { root, cache, executable } = browserFixture();
  browser(executable, browserSpec.browserVersion);
  const contents = join(root, "Installed Chrome.app", "Contents");
  mkdirSync(join(contents, "MacOS"), { recursive: true });
  const override = join(contents, "MacOS", "Chrome");
  writeFileSync(override, `#!${process.execPath}\nprocess.exit(7);\n`, {
    mode: 0o755,
  });
  writeFileSync(join(contents, "Info.plist"), "synthetic plist fixture");
  tool(
    root,
    "plutil",
    'console.log(process.argv[2] === "-extract" && process.argv[3] === "CFBundleShortVersionString" ? "154.0.8037.98" : "invalid")',
  );
  const result = run(root, {
    PLAYWRIGHT_BROWSERS_PATH: cache,
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: override,
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Browser: OK (explicit override");
  expect(result.stdout).toContain("154.0.8037.98");
});
