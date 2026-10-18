import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";

const timeout = 2000;
// Version shims may otherwise download the requested package manager implicitly.
const probeEnv = {
  ...process.env,
  COREPACK_ENABLE_NETWORK: "0",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  npm_config_manage_package_manager_versions: "false",
  MISE_AUTO_INSTALL: "false",
  MISE_OFFLINE: "true",
};
function probe(command, args) {
  const result = spawnSync(command, args, {
    env: probeEnv,
    encoding: "utf8",
    timeout,
    killSignal: "SIGKILL",
    maxBuffer: 4096,
  });
  const failure =
    result.error?.code === "ENOENT"
      ? "saknas"
      : result.error?.code === "ETIMEDOUT"
        ? "timeout (2 s)"
        : result.error?.code === "EACCES" || result.error?.code === "EPERM"
          ? "nekad behörighet"
          : result.error || result.status !== 0
            ? "misslyckades"
            : null;
  return { failure, output: result.stdout?.trim() ?? "" };
}
function matches(version, requirement) {
  const parts = requirement.replace(/\.x$/, "").split(".");
  return (
    /^\d+(?:\.\d+){0,2}$/.test(parts.join(".")) &&
    parts.every((part, index) => version.split(".")[index] === part)
  );
}
let complete = true;
function report(label, failure, detail, next) {
  if (failure) complete = false;
  console.log(
    `${label}: ${failure ?? "OK"}${detail ? ` ${detail}` : ""}${failure ? `. Nästa steg: ${next}` : ""}`,
  );
}
try {
  const tools = Object.fromEntries(
    readFileSync(".tool-versions", "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)),
  );
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const pnpm = /^pnpm@([\d.]+)(?:\+.*)?$/.exec(pkg.packageManager)?.[1];
  if (!tools.node || !tools.bun || !pkg.engines?.node || !pnpm)
    throw new Error("configuration");
  for (const [command, label, requirements] of [
    ["node", "Node", [tools.node, pkg.engines.node]],
    ["bun", "Bun", [tools.bun]],
    ["pnpm", "pnpm", [pnpm]],
  ]) {
    const result = probe(command, ["--version"]);
    const version = /^v?(\d+\.\d+\.\d+)$/.exec(result.output)?.[1];
    const failure =
      result.failure ??
      (!version
        ? "ogiltigt versionssvar"
        : !requirements.every((requirement) => matches(version, requirement))
          ? "fel version"
          : null);
    report(
      label,
      failure,
      `${version ?? ""} (krav ${requirements.join(" och ")})`.trim(),
      "välj redan installerat verktyg enligt .tool-versions och package.json i PATH. Kör versionen direkt vid shim-/behörighetsfel; installation eller utökad skrivbehörighet kräver eget beslut.",
    );
  }
  // Mirrors the default headless Chromium project in playwright.config.ts.
  // Resolve through @playwright/test so pnpm's isolated dependencies work too.
  const resolution = probe("node", [
    "--input-type=commonjs",
    "-e",
    `
    const { createRequire } = require("node:module");
    const { resolve } = require("node:path");
    const local = createRequire(resolve("package.json"));
    const test = createRequire(local.resolve("@playwright/test"));
    const playwright = createRequire(test.resolve("playwright"));
    const core = createRequire(playwright.resolve("playwright-core"));
    const selected = core("playwright-core/lib/coreBundle").registry.registry.findExecutable("chromium-headless-shell");
    console.log(JSON.stringify({ executable: selected.executablePath(), version: selected.browserVersion, revision: selected.revision }));
  `,
  ]);
  const nextBrowser =
    "kör pnpm install med låsfilen om Playwright saknas. Installera rätt browser med pnpm exec playwright install chromium (kräver nedladdning/skrivbehörighet), eller välj en verifierad installerad Chrome via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. Kör sedan pnpm test:e2e.";
  if (resolution.failure) {
    report("Browser", resolution.failure, "(Playwright-uppslag)", nextBrowser);
  } else {
    let selected;
    try {
      selected = JSON.parse(resolution.output);
    } catch {
      /* sanitized below */
    }
    if (
      !selected?.executable ||
      !/^\d+\.\d+\.\d+\.\d+$/.test(selected.version) ||
      !/^\d+$/.test(selected.revision)
    ) {
      report("Browser", "ogiltigt Playwright-svar", "", nextBrowser);
    } else {
      const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      const browser = probe(override || selected.executable, ["--version"]);
      const version =
        /^(?:Chromium|Google Chrome(?: for Testing)?|Chrome(?: for Testing)?) (\d+\.\d+\.\d+\.\d+)\s*$/.exec(
          browser.output,
        )?.[1];
      const failure =
        browser.failure ??
        (!version
          ? "ogiltigt versionssvar"
          : !override && version !== selected.version
            ? "versionskonflikt"
            : null);
      report(
        "Browser",
        failure,
        `(${override ? "explicit override" : `chromium-headless-shell build ${selected.revision}`}; version ${version ?? "okänd"}; Playwright förväntar ${selected.version})`,
        nextBrowser,
      );
    }
  }
} catch {
  report(
    "Konfiguration",
    "kunde inte läsas",
    "",
    "kör i repots rot med läsbara .tool-versions och package.json (engines/packageManager).",
  );
}
try {
  for (const directory of [".", ".next", "test-results", "playwright-report"]) {
    if (existsSync(directory)) {
      const temporary = mkdtempSync(join(directory, ".preflight-"));
      rmSync(temporary, { recursive: true });
    }
  }
  report(
    "Skrivbehörighet",
    null,
    "(worktree och befintliga verifieringskataloger)",
  );
} catch {
  report(
    "Skrivbehörighet",
    "nekad",
    "",
    "använd ett skrivbart worktree och skrivbara verifieringskataloger, eller begär uttryckligen nödvändig sandboxbehörighet. Ändra inte globala trust-inställningar.",
  );
}
console.log(
  `Lokal körmiljö: ${complete ? "stödd" : "ofullständig"}. Förtestet ersätter inte pnpm check eller pnpm test:e2e.`,
);
process.exitCode = complete ? 0 : 1;
