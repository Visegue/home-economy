import { PGlite } from "@electric-sql/pglite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function preparePgliteDataDir(dataDir: string): string {
  if (dataDir.includes("://")) return dataDir;

  mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  return dataDir;
}

// Next's route-analysis workers import modules without serving database requests.
// Defer the disk database until use so those imports do not open a second owner.
export function createPgliteClient(dataDir: string): PGlite {
  const globalDatabase = globalThis as typeof globalThis & {
    homeEconomyPglite?: PGlite;
  };
  let client: PGlite | undefined;
  return new Proxy({} as PGlite, {
    get(_target, property) {
      client ??=
        globalDatabase.homeEconomyPglite ??
        new PGlite(preparePgliteDataDir(dataDir));
      if (process.env.NODE_ENV !== "production")
        globalDatabase.homeEconomyPglite = client;
      const value = Reflect.get(client, property, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
