import nextEnv from "@next/env";
import { withNextOutput } from "./with-next-output.mjs";

nextEnv.loadEnvConfig(process.cwd(), true);

// PGlite-backed Next flows fail under Bun; keep the verified Node runtime.
const needsNode = process.env.DATABASE_PROVIDER === "pglite";
process.exitCode = await withNextOutput(
  "dev",
  needsNode ? "node" : process.execPath,
  [
    ...(needsNode ? [] : ["--bun"]),
    "node_modules/next/dist/bin/next",
    "dev",
    ...process.argv.slice(2),
  ],
);
