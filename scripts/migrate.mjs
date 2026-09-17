import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";
import { getDatabaseConfig, getMigrationUrl } from "../src/db/config.ts";
import { migrateWithHistoryCheck } from "./migration-history.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const migrationsFolder = "drizzle";
const config = getDatabaseConfig();

if (config.provider === "postgres") {
  const hostedUrl = getMigrationUrl();
  const client = new Client({
    connectionString: hostedUrl,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    // One direct connection holds the lock through validation and migration.
    // Queries are unnamed, so no persistent prepared statements are created.
    await client.query("select pg_advisory_lock(784521903)");
    try {
      await migrateWithHistoryCheck(
        async (query) => (await client.query(query)).rows,
        migrationsFolder,
        () => migratePostgres(drizzlePostgres(client), { migrationsFolder }),
      );
    } finally {
      await client.query("select pg_advisory_unlock(784521903)");
    }
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
    await migrateWithHistoryCheck(
      async (query) => (await client.query(query)).rows,
      migrationsFolder,
      () => migratePglite(drizzlePglite(client), { migrationsFolder }),
    );
    process.stdout.write("Lokala PGlite-migrationer är applicerade.\n");
  } finally {
    await client.close();
  }
}
