import { PGlite } from "@electric-sql/pglite";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseConfig } from "./config";
import { preparePgliteDataDir } from "./pglite";
import { schema } from "./schema";

const globalDatabase = globalThis as typeof globalThis & {
  homeEconomyPglite?: PGlite;
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

  const client =
    globalDatabase.homeEconomyPglite ??
    new PGlite(preparePgliteDataDir(config.dataDir));

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.homeEconomyPglite = client;
  }

  return drizzlePglite(client, { schema });
}

export const db = createDatabase();
