import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd(), true);

// PGlite-backed Next flows fail under Bun; keep the verified Node runtime.
const needsNode = process.env.DATABASE_PROVIDER === "pglite";
const result = spawnSync(
  needsNode ? "node" : process.execPath,
  [
    ...(needsNode ? [] : ["--bun"]),
    "node_modules/next/dist/bin/next",
    "dev",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env: process.env },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
