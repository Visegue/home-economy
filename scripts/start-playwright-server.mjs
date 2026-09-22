import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Seed before Next starts: only one process may own a PGlite data directory.
const dataDir = await mkdtemp(join(tmpdir(), "hemekonomi-playwright-"));
try {
  const database = new PGlite(dataDir);
  try {
    await migrate(drizzle(database), { migrationsFolder: "drizzle" });
    for (const id of [
      "onboarding-0",
      "onboarding-1",
      "onboarding-2",
      "budget-0",
      "budget-1",
      "budget-2",
      "budget-outsider-0",
      "budget-outsider-1",
      "budget-outsider-2",
      "budget-preview",
      "form-feedback-0",
      "form-feedback-1",
      "form-feedback-2",
      "help-0",
      "help-1",
      "help-2",
      "expired",
      "income-0",
      "income-1",
      "income-2",
      "savings-0",
      "savings-1",
      "savings-2",
    ]) {
      await database.query(
        `insert into public."user" (id, name, email, email_verified)
         values ($1, 'Testanvändare', $2, true)`,
        [id, `${id}@example.test`],
      );
      await database.query(
        `insert into public.session (id, token, user_id, expires_at, updated_at)
         values ($1, $1, $1, $2, now())`,
        [id, new Date(Date.now() + (id === "expired" ? -1 : 1) * 86_400_000)],
      );
    }
  } finally {
    await database.close();
  }

  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_PROVIDER: "pglite",
        PGLITE_DATA_DIR: dataDir,
        DATABASE_URL: "",
        DATABASE_MIGRATION_URL: "",
        // These tests never exercise external OAuth or email delivery.
        RESEND_API_KEY: "",
      },
    },
  );
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.kill(signal));
  }
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("exit", (code) => {
      process.exitCode = code ?? 0;
      resolve();
    });
  });
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
