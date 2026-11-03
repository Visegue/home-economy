import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

export function localToolEnvironment(env = process.env) {
  return {
    ...env,
    COREPACK_ENABLE_NETWORK: "0",
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    PNPM_CONFIG_OFFLINE: "true",
    PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "error",
    PNPM_CONFIG_PM_ON_FAIL: "error",
    PNPM_CONFIG_RUNTIME_ON_FAIL: "error",
    npm_config_manage_package_manager_versions: "false",
    MISE_AUTO_INSTALL: "false",
    MISE_OFFLINE: "true",
  };
}

export function probe(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env: localToolEnvironment(env),
    encoding: "utf8",
    timeout: 2000,
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

export function matches(version, requirement) {
  const parts = requirement.replace(/\.x$/, "").split(".");
  return (
    /^\d+(?:\.\d+){0,2}$/.test(parts.join(".")) &&
    parts.every((part, index) => version.split(".")[index] === part)
  );
}

function entries(directory) {
  try {
    return readdirSync(directory).sort((a, b) =>
      b.localeCompare(a, "en", { numeric: true }),
    );
  } catch {
    return [];
  }
}

function candidates(name, env) {
  const home = env.HOME || homedir();
  const mise =
    env.MISE_DATA_DIR ||
    join(env.XDG_DATA_HOME || join(home, ".local", "share"), "mise");
  const installed = join(mise, "installs", name);
  const paths = (env.PATH || "")
    .split(delimiter)
    .filter(Boolean)
    .map((directory) => join(directory, name));
  paths.push(
    ...entries(installed).map((version) =>
      join(installed, version, "bin", name),
    ),
  );
  if (name === "node" && !process.versions.bun) paths.push(process.execPath);
  if (name === "bun" && process.versions.bun) paths.push(process.execPath);
  if (name === "pnpm") {
    const cache =
      env.COREPACK_HOME ||
      join(
        env.XDG_CACHE_HOME || env.LOCALAPPDATA || join(home, ".cache"),
        "node",
        "corepack",
      );
    const cached = join(cache, "v1", "pnpm");
    for (const version of entries(cached)) {
      paths.push(
        join(cached, version, "bin", "pnpm.mjs"),
        join(cached, version, "bin", "pnpm.cjs"),
      );
    }
  }
  const unique = new Set();
  for (const path of paths) {
    try {
      unique.add(realpathSync(path));
    } catch {
      /* Absent candidates are normal. */
    }
  }
  return [...unique];
}

export function resolveLocalTools(root, sourceEnv = process.env) {
  const config = Object.fromEntries(
    readFileSync(join(root, ".tool-versions"), "utf8")
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => line.trim().split(/\s+/)),
  );
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const pnpm = /^pnpm@(\d+\.\d+\.\d+)(?:\+.*)?$/.exec(pkg.packageManager)?.[1];
  if (!config.node || !config.bun || !pkg.engines?.node || !pnpm)
    throw new Error(
      "Ogiltig runtimekonfiguration i .tool-versions/package.json.",
    );
  const env = localToolEnvironment(sourceEnv);
  const tools = {};
  for (const [name, requirements] of [
    ["node", [config.node, pkg.engines.node]],
    ["bun", [config.bun]],
    ["pnpm", [pnpm]],
  ]) {
    for (const path of candidates(name, env)) {
      const command =
        name === "pnpm" && /\.[cm]?js$/.test(path) ? tools.node.command : path;
      const args = command === path ? [] : [path];
      const result = probe(command, [...args, "--version"], env);
      const version = /^v?(\d+\.\d+\.\d+)$/.exec(result.output)?.[1];
      if (
        !result.failure &&
        version &&
        requirements.every((requirement) => matches(version, requirement))
      ) {
        tools[name] = { command, args };
        env.PATH = [dirname(path), env.PATH].filter(Boolean).join(delimiter);
        break;
      }
    }
    if (!tools[name])
      throw new Error(
        `${name}: ingen kompatibel installerad version (${requirements.join(" och ")}). Installera projektets verktyg enligt docs/local-development.md före verifiering.`,
      );
  }
  return tools;
}

function quote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function pinLocalTools(tools) {
  const directory = mkdtempSync(join(tmpdir(), "home-economy-tools-"));
  try {
    for (const name of ["node", "bun"])
      symlinkSync(tools[name].command, join(directory, name));
    const pnpm = [tools.pnpm.command, ...tools.pnpm.args].map(quote).join(" ");
    writeFileSync(join(directory, "pnpm"), `#!/bin/sh\nexec ${pnpm} "$@"\n`, {
      mode: 0o700,
    });
    return {
      directory,
      env: {
        ...localToolEnvironment(),
        PATH: [directory, process.env.PATH].filter(Boolean).join(delimiter),
      },
      dispose: () => rmSync(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
