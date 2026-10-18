import { withNextOutput } from "./with-next-output.mjs";

// Configuration is imported during the build; no database is queried.
// This verification artifact is never deployed.
Object.assign(process.env, {
  NODE_ENV: "production",
  DATABASE_PROVIDER: "postgres",
  DATABASE_URL: "postgresql://build:unused@127.0.0.1:5432/build_only",
  BETTER_AUTH_SECRET: "synthetic-ci-build-secret-not-for-deployment",
});

process.exitCode = await withNextOutput("build:check", process.execPath, [
  "--bun",
  "node_modules/next/dist/bin/next",
  "build",
  "--webpack",
]);
