// @vitest-environment node
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const runner = fileURLToPath(
  new URL("./with-next-output.mjs", import.meta.url),
);

it("rejects another Next-output owner before its command starts", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "next-output-"));
  const owner = spawn(
    process.execPath,
    [
      runner,
      "test:e2e",
      process.execPath,
      "-e",
      "console.log('READY'); setInterval(() => {}, 1000)",
    ],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise((resolve, reject) => {
      owner.stdout.once("data", resolve);
      owner.once("error", reject);
      owner.once("exit", () => reject(new Error("Owner exited before ready")));
    });
    const contender = spawnSync(
      process.execPath,
      [runner, "build:check", process.execPath, "-e", "console.log('STARTED')"],
      { cwd, encoding: "utf8", timeout: 5000 },
    );
    expect(contender.status).toBe(73);
    expect(contender.stderr).toContain("test:e2e");
    expect(contender.stdout).not.toContain("STARTED");
  } finally {
    owner.kill("SIGTERM");
    await new Promise((resolve) => owner.once("close", resolve));
    rmSync(cwd, { recursive: true, force: true });
  }
}, 15_000);

it.each([0, 7])(
  "releases ownership after child exit %i and preserves its status",
  (status) => {
    const cwd = mkdtempSync(join(tmpdir(), "next-output-"));
    try {
      const first = spawnSync(
        process.execPath,
        [runner, "build", process.execPath, "-e", `process.exit(${status})`],
        { cwd, encoding: "utf8", timeout: 5000 },
      );
      expect(first.status).toBe(status);
      const next = spawnSync(
        process.execPath,
        [runner, "typecheck", process.execPath, "-e", "console.log('NEXT')"],
        { cwd, encoding: "utf8", timeout: 5000 },
      );
      expect(next.status).toBe(0);
      expect(next.stdout).toContain("NEXT");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  },
);

it("allows independent worktrees to own their own output concurrently", async () => {
  const first = mkdtempSync(join(tmpdir(), "next-output-"));
  const second = mkdtempSync(join(tmpdir(), "next-output-"));
  const owner = spawn(
    process.execPath,
    [
      runner,
      "test:e2e",
      process.execPath,
      "-e",
      "console.log('READY'); setInterval(() => {}, 1000)",
    ],
    { cwd: first, stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise((resolve, reject) => {
      owner.stdout.once("data", resolve);
      owner.once("error", reject);
    });
    const result = spawnSync(
      process.execPath,
      [
        runner,
        "build:check",
        process.execPath,
        "-e",
        "console.log('INDEPENDENT')",
      ],
      { cwd: second, encoding: "utf8", timeout: 5000 },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("INDEPENDENT");
  } finally {
    owner.kill("SIGTERM");
    await new Promise((resolve) => owner.once("close", resolve));
    rmSync(first, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
}, 15_000);

it("releases ownership when the executable cannot start", () => {
  const cwd = mkdtempSync(join(tmpdir(), "next-output-"));
  try {
    const missing = spawnSync(
      process.execPath,
      [runner, "build", "missing-synthetic-next-command"],
      { cwd, encoding: "utf8", timeout: 5000 },
    );
    expect(missing.status).not.toBe(0);
    const next = spawnSync(
      process.execPath,
      [runner, "build", process.execPath, "-e", "console.log('RECOVERED')"],
      { cwd, encoding: "utf8", timeout: 5000 },
    );
    expect(next.status).toBe(0);
    expect(next.stdout).toContain("RECOVERED");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

it("holds ownership through graceful child shutdown", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "next-output-"));
  const owner = spawn(
    process.execPath,
    [
      runner,
      "test:e2e",
      process.execPath,
      "-e",
      `
    const fs = require("node:fs");
    process.on("SIGTERM", () => console.log("STOPPING"));
    setInterval(() => { if (fs.existsSync("finish")) process.exit(0); }, 10);
    console.log("READY");
  `,
    ],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );
  const closed = new Promise((resolve) => owner.once("close", resolve));
  try {
    await new Promise((resolve, reject) => {
      owner.stdout.once("data", resolve);
      owner.once("error", reject);
    });
    const stopping = new Promise((resolve) =>
      owner.stdout.once("data", resolve),
    );
    owner.kill("SIGTERM");
    await stopping;
    const contender = spawnSync(
      process.execPath,
      [runner, "build", process.execPath, "-e", "console.log('STARTED')"],
      { cwd, encoding: "utf8", timeout: 5000 },
    );
    expect(contender.status).toBe(73);
    expect(contender.stdout).not.toContain("STARTED");
  } finally {
    writeFileSync(join(cwd, "finish"), "");
    await closed;
    rmSync(cwd, { recursive: true, force: true });
  }
}, 15_000);
