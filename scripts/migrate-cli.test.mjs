// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const migrateScript = resolve("scripts/migrate.mjs");

it.each([process.execPath, "bun"])(
  "reports invalid migration timestamps and finishes PGlite cleanup with %s",
  async (runtime) => {
    const folder = await mkdtemp(join(tmpdir(), "migration-cli-"));
    try {
      const migrations = join(folder, "drizzle");
      await mkdir(join(migrations, "meta"), { recursive: true });
      await writeFile(
        join(migrations, "meta/_journal.json"),
        JSON.stringify({
          version: "7",
          dialect: "postgresql",
          entries: ["first", "second"].map((tag, idx) => ({
            idx,
            version: "7",
            when: 1000,
            tag,
            breakpoints: true,
          })),
        }),
      );
      await Promise.all(
        ["first", "second"].map((tag) =>
          writeFile(join(migrations, `${tag}.sql`), "select 1;"),
        ),
      );
      const result = spawnSync(runtime, [migrateScript], {
        cwd: folder,
        env: {
          ...process.env,
          DATABASE_PROVIDER: "pglite",
          PGLITE_DATA_DIR: "memory://",
          NODE_ENV: "test",
          VERCEL: "",
          VERCEL_ENV: "",
        },
        encoding: "utf8",
        timeout: 20_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("strikt stigande");
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  },
  25_000,
);
