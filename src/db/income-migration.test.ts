// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("preserves legacy income months including zero, without duplicating on rerun", async () => {
  const folder = await mkdtemp(join(tmpdir(), "income-migration-"));
  const client = new PGlite("memory://");
  try {
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    const previous = {
      ...journal,
      entries: journal.entries.filter(
        (entry: { idx: number }) => entry.idx < 5,
      ),
    };
    await mkdir(join(folder, "meta"));
    await writeFile(
      join(folder, "meta/_journal.json"),
      JSON.stringify(previous),
    );
    for (const entry of previous.entries)
      await copyFile(
        `drizzle/${entry.tag}.sql`,
        join(folder, `${entry.tag}.sql`),
      );
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: folder });
    await client.exec(`
      insert into public."user" (id, name, email, email_verified) values ('migration-test', 'Testperson', 'migration@example.test', true);
      insert into households (name, owner_user_id) values ('Testhushåll', 'migration-test');
      insert into monthly_plans (household_id, period, planned_income) select id, '2026-09-01', 30000.50 from households;
      insert into monthly_plans (household_id, period, planned_income) select id, '2026-10-01', 0 from households;
    `);
    await migrate(db, { migrationsFolder: "drizzle" });
    await migrate(db, { migrationsFolder: "drizzle" });
    const result = await client.query(
      "select name, amount::text, starts_on::text, ends_on::text from household_incomes order by starts_on",
    );
    expect(result.rows).toEqual([
      {
        name: "Tidigare registrerad inkomst",
        amount: "30000.50",
        starts_on: "2026-09-01",
        ends_on: "2026-09-01",
      },
      {
        name: "Tidigare registrerad inkomst",
        amount: "0.00",
        starts_on: "2026-10-01",
        ends_on: "2026-10-01",
      },
    ]);
    await expect(
      client.exec(
        "insert into household_incomes (household_id, name, amount, starts_on, ends_on) select id, 'Invalid', 1, '2026-10-01', '2026-09-01' from households",
      ),
    ).rejects.toMatchObject({ code: "23514" });
  } finally {
    await client.close();
    await rm(folder, { recursive: true, force: true });
  }
});
