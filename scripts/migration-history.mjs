import { readMigrationFiles } from "drizzle-orm/migrator";

function assertHistory(migrations, applied) {
  for (let index = 0; index < applied.length; index++) {
    const expected = migrations[index];
    const actual = applied[index];
    if (
      !expected ||
      Number(actual.created_at) !== expected.folderMillis ||
      actual.hash !== expected.hash
    ) {
      throw new Error(
        `Migrationshistoriken avviker vid position ${index + 1}. Återställ den applicerade migrationsfilen och skapa en ny migration. Ändra inte databasens migrationshistorik för att kringgå kontrollen.`,
      );
    }
  }
}

export async function migrateWithHistoryCheck(
  query,
  migrationsFolder,
  migrate,
) {
  const migrations = readMigrationFiles({ migrationsFolder });
  for (let index = 0; index < migrations.length; index++) {
    const timestamp = migrations[index].folderMillis;
    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp <= 0 ||
      (index > 0 && timestamp <= migrations[index - 1].folderMillis)
    ) {
      throw new Error(
        "Migrationernas tidsstämplar måste vara strikt stigande.",
      );
    }
  }

  async function readHistory() {
    const [table] = await query(
      "select to_regclass('drizzle.__drizzle_migrations') as name",
    );
    return table.name
      ? query(
          "select hash, created_at from drizzle.__drizzle_migrations order by created_at, id",
        )
      : [];
  }

  assertHistory(migrations, await readHistory());
  await migrate();
  const applied = await readHistory();
  assertHistory(migrations, applied);
  if (applied.length !== migrations.length) {
    throw new Error("Alla förväntade migrationer har inte applicerats.");
  }
}
