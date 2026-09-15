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

it("upgrades main, preserving monthly and member incomes including zero without duplicating on rerun", async () => {
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
      insert into public."user" (id, name, email, email_verified) values ('zero', 'Zero', 'zero@example.test', true), ('missing', 'Missing', 'missing@example.test', true);
      insert into household_members (household_id, user_id, display_name) select id, 'migration-test', 'Testperson' from households;
      insert into household_members (household_id, user_id) select id, person from households cross join (values ('zero'), ('missing')) as people(person);
      insert into household_member_income (household_id, user_id, monthly_net_income, updated_at) select id, 'migration-test', 12345.67, '2026-08-31 22:30:00+00' from households;
      insert into household_member_income (household_id, user_id, monthly_net_income, updated_at) select id, 'zero', 0, '2026-09-01 00:00:00+00' from households;
      insert into household_member_income (household_id, user_id, monthly_net_income) select id, 'missing', null from households;
      insert into monthly_plans (household_id, period, planned_income) select id, '2026-09-01', 30000.50 from households;
      insert into monthly_plans (household_id, period, planned_income) select id, '2026-10-01', 0 from households;
    `);
    await migrate(db, { migrationsFolder: "drizzle" });
    await migrate(db, { migrationsFolder: "drizzle" });
    const result = await client.query(
      "select name, amount::text, starts_on::text, ends_on::text from household_incomes where ends_on is not null order by starts_on",
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
    const ongoing = await client.query(
      "select name, amount::text, starts_on::text, ends_on from household_incomes where ends_on is null order by amount desc",
    );
    expect(ongoing.rows).toEqual([
      {
        name: "Månadsinkomst – Testperson",
        amount: "12345.67",
        starts_on: "2026-09-01",
        ends_on: null,
      },
      {
        name: "Månadsinkomst",
        amount: "0.00",
        starts_on: "2026-09-01",
        ends_on: null,
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
