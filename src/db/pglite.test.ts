// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

function run(source: string) {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    {
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

it("allows import-only clients while another client owns the offline database", () => {
  const directory = mkdtempSync(join(tmpdir(), "pglite-import-only-"));
  try {
    expect(
      run(`
      import { PGlite } from '@electric-sql/pglite';
      import { createPgliteClient } from './src/db/pglite.ts';
      const owner = new PGlite(${JSON.stringify(directory)});
      await owner.waitReady;
      createPgliteClient(${JSON.stringify(directory)});
      await new Promise(resolve => setTimeout(resolve, 300));
      await owner.close();
      console.log('import-only passed');
    `),
    ).toBe("import-only passed");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("supports real queries and transactions with the lazy client's method receiver", () => {
  expect(
    run(`
    import { createPgliteClient } from './src/db/pglite.ts';
    const client = createPgliteClient('memory://');
    const first = await client.query('select 42 as answer');
    const second = await client.transaction(tx => tx.query('select 7 as answer'));
    console.log(JSON.stringify([first.rows[0].answer, second.rows[0].answer]));
    await client.close();
  `),
  ).toBe("[42,7]");
});
