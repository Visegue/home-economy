// @vitest-environment node
import { describe, expect, it } from "vitest";

import { getDatabaseConfig, getMigrationUrl } from "./config";

describe("database environment isolation", () => {
  it("requires a database URL even in local development", () => {
    expect(() => getDatabaseConfig({ NODE_ENV: "development" })).toThrow(
      "DATABASE_URL saknas",
    );
    expect(() => getDatabaseConfig({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL saknas",
    );
  });
  it("uses Postgres by default", () => {
    expect(getDatabaseConfig({ DATABASE_URL: "postgresql://local" })).toEqual({
      provider: "postgres",
      url: "postgresql://local",
    });
  });
  it("lets explicit offline mode override local Neon credentials", () => {
    expect(
      getDatabaseConfig({
        DATABASE_PROVIDER: "pglite",
        DATABASE_URL: "postgresql://local",
        NODE_ENV: "development",
      }).provider,
    ).toBe("pglite");
  });
  it.each([
    { NODE_ENV: "production" },
    { VERCEL: "1" },
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" },
  ])("rejects PGlite in hosted environments: %j", (env) => {
    expect(() =>
      getDatabaseConfig({ ...env, DATABASE_PROVIDER: "pglite" }),
    ).toThrow("PGlite får endast");
  });
  it("rejects a misspelled provider", () => {
    expect(() => getDatabaseConfig({ DATABASE_PROVIDER: "neonn" })).toThrow(
      "DATABASE_PROVIDER",
    );
  });
  it("never falls back to runtime credentials for migrations", () => {
    expect(() =>
      getMigrationUrl({ DATABASE_URL: "postgresql://runtime" }),
    ).toThrow("DATABASE_MIGRATION_URL saknas");
    expect(() =>
      getMigrationUrl({
        DATABASE_MIGRATION_URL:
          "postgresql://owner:unused@ep-example-pooler.neon.tech/db",
      }),
    ).toThrow("utan pooler");
    expect(() =>
      getMigrationUrl({
        DATABASE_MIGRATION_URL:
          "postgresql://home_economy_runtime:unused@ep-example.neon.tech/db",
      }),
    ).toThrow("Runtime-rollen");
  });
});
