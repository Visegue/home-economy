import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseConfig } from "./config";
import { createPgliteClient } from "./pglite";
import { schema } from "./schema";

const globalDatabase = globalThis as typeof globalThis & {
  homeEconomyPostgres?: Pool;
};

function createDatabase() {
  const config = getDatabaseConfig();

  if (config.provider === "postgres") {
    const pool =
      globalDatabase.homeEconomyPostgres ??
      new Pool({
        connectionString: config.url,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 5_000,
        max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      });

    if (!globalDatabase.homeEconomyPostgres) {
      globalDatabase.homeEconomyPostgres = pool;
      if (process.env.VERCEL === "1") {
        attachDatabasePool(pool);
      }
    }

    return drizzlePostgres(pool, { schema });
  }

  return drizzlePglite({ client: createPgliteClient(config.dataDir), schema });
}

export const db = createDatabase();
