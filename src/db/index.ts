import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseConfig } from "./config";
import { preparePgliteDataDir } from "./pglite";
import { schema } from "./schema";

const globalDatabase = globalThis as typeof globalThis & {
  homeEconomyPglite?: PGlite;
  homeEconomyPostgres?: ReturnType<typeof postgres>;
};

function createDatabase() {
  const config = getDatabaseConfig();

  if (config.provider === "postgres") {
    const client =
      globalDatabase.homeEconomyPostgres ??
      postgres(config.url, {
        max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
        prepare: false,
      });

    if (process.env.NODE_ENV !== "production") {
      globalDatabase.homeEconomyPostgres = client;
    }

    return drizzlePostgres(client, { schema });
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
