import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { hashPassword } from "better-auth/crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const testArgs = JSON.parse(process.env.PLAYWRIGHT_TEST_ARGS ?? "null");
if (!Array.isArray(testArgs))
  throw new Error("Start Playwright with pnpm test:e2e");
const sessions = JSON.parse(
  execFileSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve("@playwright/test/cli")),
      ...testArgs,
      "--list",
      `--reporter=${fileURLToPath(new URL("./playwright-session-reporter.mjs", import.meta.url))}`,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  ),
);

// Seed before Next starts: only one process may own a PGlite data directory.
const dataDir = await mkdtemp(join(tmpdir(), "hemekonomi-playwright-"));
try {
  const database = new PGlite(dataDir);
  try {
    await migrate(drizzle(database), { migrationsFolder: "drizzle" });
    const passwordHash = await hashPassword("synthetic-account-password-123");
    for (const { userId: id, token, otherToken, profile } of sessions) {
      if (profile === "missing") continue;
      await database.query(
        `insert into public."user" (id, name, email, email_verified)
         values ($1, 'Testanvändare', $2, true)`,
        [id, `${id}@example.test`],
      );
      for (const sessionToken of [token, otherToken]) {
        await database.query(
          `insert into public.session (id, token, user_id, expires_at, updated_at)
           values ($1, $1, $2, $3, now())`,
          [
            sessionToken,
            id,
            new Date(
              Date.now() + (profile === "expired" ? -1 : 1) * 86_400_000,
            ),
          ],
        );
      }
      if (profile === "legacy") {
        // Synthetic legacy versions cannot be created through the modern UI.
        // Seed them before Next starts; assertions use only the public app.
        await database.query("select set_config('app.user_id', $1, false)", [
          id,
        ]);
        const {
          rows: [household],
        } = await database.query(
          `insert into public.households (name, owner_user_id) values ('Äldre posttest', $1) returning id`,
          [id],
        );
        await database.query(
          `insert into public.household_members (household_id, user_id, role) values ($1, $2, 'owner')`,
          [household.id, id],
        );
        for (const amount of ["100.00", "200.00"]) {
          await database.query(
            `insert into public.savings_goals (household_id, name, monthly_contribution) values ($1, 'Äldre sparande', $2)`,
            [household.id, amount],
          );
          await database.query(
            `insert into public.recurring_items (household_id, name, kind, amount, cadence_unit) values ($1, 'Äldre utgift', 'expense', $2, 'month')`,
            [household.id, amount],
          );
        }
      }
      if (["credential", "google"].includes(profile)) {
        const credential = profile === "credential";
        await database.query(
          `insert into public.account (id, account_id, provider_id, user_id, password)
           values ($1, $1, $2, $1, $3)`,
          [
            id,
            credential ? "credential" : "google",
            credential ? passwordHash : null,
          ],
        );
      }
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
