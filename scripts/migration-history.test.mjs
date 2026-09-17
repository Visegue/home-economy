// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, expect, it } from "vitest";
import { migrateWithHistoryCheck } from "./migration-history.mjs";

let client;
let folder;
beforeEach(async () => {
  client = new PGlite("memory://");
  folder = await mkdtemp(join(tmpdir(), "migration-history-"));
  await mkdir(join(folder, "meta"));
});
afterEach(async () => {
  await client.close();
  await rm(folder, { recursive: true, force: true });
});
async function files(entries) {
  await writeFile(
    join(folder, "meta/_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "postgresql",
      entries: entries.map(({ when }, idx) => ({
        idx,
        when,
        tag: `migration_${idx}`,
        breakpoints: true,
      })),
    }),
  );
  for (const [idx, entry] of entries.entries())
    await writeFile(join(folder, `migration_${idx}.sql`), entry.sql);
}
const first = { when: 1000, sql: "create table first_table (id integer);" };
const second = { when: 2000, sql: "create table second_table (id integer);" };
function run() {
  return migrateWithHistoryCheck(
    async (query) => (await client.query(query)).rows,
    folder,
    () => migrate(drizzle(client), { migrationsFolder: folder }),
  );
}
it("migrates a fresh database, reruns safely and appends new migrations", async () => {
  await files([first]);
  await run();
  await run();
  await files([first, second]);
  await run();
  expect(
    (await client.query("select * from drizzle.__drizzle_migrations")).rows,
  ).toHaveLength(2);
});
it("rejects edited applied SQL before applying any new migration", async () => {
  await files([first]);
  await run();
  await files([
    { ...first, sql: "create table changed_table (id integer);" },
    second,
  ]);
  await expect(run()).rejects.toThrow("Migrationshistoriken avviker");
  expect(
    (await client.query("select to_regclass('second_table') as name")).rows[0]
      .name,
  ).toBeNull();
});
it("rejects a database containing another branch's migration", async () => {
  await files([first, second]);
  await run();
  await files([first]);
  await expect(run()).rejects.toThrow("Migrationshistoriken avviker");
});
it("rejects inserting an older migration into applied history", async () => {
  await files([first, second]);
  await run();
  await files([first, { when: 1500, sql: "select 1;" }, second]);
  await expect(run()).rejects.toThrow("Migrationshistoriken avviker");
});
it("rejects duplicate timestamps instead of silently skipping migrations", async () => {
  await files([first, { ...second, when: 1000 }]);
  await expect(run()).rejects.toThrow("strikt stigande");
});
