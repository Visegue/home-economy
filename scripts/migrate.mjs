import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";
import { getDatabaseConfig, getMigrationUrl } from "../src/db/config.ts";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const migrationsFolder = "drizzle";
const config = getDatabaseConfig();

if (config.provider === "postgres") {
  const hostedUrl = getMigrationUrl();
  const client = postgres(hostedUrl, { max: 1, prepare: false });
  try {
    await migratePostgres(drizzlePostgres(client), { migrationsFolder });
    process.stdout.write("Neon/Postgres migrationer är applicerade.\n");
  } finally {
    await client.end();
  }
} else {
  const dataDir = config.dataDir;
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
