type Environment = Record<string, string | undefined>;

export function getDatabaseConfig(env: Environment = process.env) {
  const provider = env.DATABASE_PROVIDER || "postgres";
  if (provider === "pglite") {
    if (
      env.VERCEL === "1" ||
      env.VERCEL_ENV === "preview" ||
      env.VERCEL_ENV === "production" ||
      env.NODE_ENV === "production"
    ) {
      throw new Error(
        "PGlite får endast användas för lokala tester och offline-utveckling.",
      );
    }
    return {
      provider,
      dataDir: env.PGLITE_DATA_DIR || ".data/pglite",
    } as const;
  }
  if (provider !== "postgres") {
    throw new Error("DATABASE_PROVIDER måste vara postgres eller pglite.");
  }
  if (!env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL saknas. Konfigurera din Neon-branch i .env.local. Offline-läge kräver DATABASE_PROVIDER=pglite.",
    );
  }
  return { provider, url: env.DATABASE_URL } as const;
}

export function getMigrationUrl(env: Environment = process.env) {
  const value = env.DATABASE_MIGRATION_URL;
  if (!value?.trim()) {
    throw new Error(
      "DATABASE_MIGRATION_URL saknas. Migrationer kräver en separat direkt ägaranslutning.",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_MIGRATION_URL är ogiltig.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname.includes("-pooler.")
  ) {
    throw new Error(
      "DATABASE_MIGRATION_URL måste vara en direkt Postgres-anslutning utan pooler.",
    );
  }
  if (decodeURIComponent(url.username) === "home_economy_runtime") {
    throw new Error("Runtime-rollen får inte användas för migrationer.");
  }
  return value;
}
