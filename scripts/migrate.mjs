import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const migrationsFolder = "drizzle";
const hostedUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (hostedUrl) {
  const client = postgres(hostedUrl, { max: 1, prepare: false });
  try {
    await migratePostgres(drizzlePostgres(client), { migrationsFolder });
    process.stdout.write("Neon/Postgres migrationer är applicerade.\n");
  } finally {
    await client.end();
  }
} else {
  const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
  if (!dataDir.includes("://")) {
    mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  }
  const client = new PGlite(dataDir);
  try {
    await migratePglite(drizzlePglite(client), { migrationsFolder });
    process.stdout.write("Lokala PGlite-migrationer är applicerade.\n");
  } finally {
    await client.close();
  }
}
