import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import postgres from "postgres";
import { getDatabaseConfig } from "../src/db/config.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
const config = getDatabaseConfig();
assert.equal(config.provider, "postgres", "db:check kräver Postgres/Neon");
const client = postgres(config.url, { max: 1, prepare: false });
const rollback = new Error("Rollback synthetic integration fixtures");

try {
  const [role] = await client`
    select current_user as name, rolsuper, rolbypassrls,
      pg_has_role(current_user, 'neon_superuser', 'member') as neon_admin
    from pg_roles where rolname = current_user
  `;
  assert.equal(role.name, "home_economy_runtime");
  assert.equal(role.rolsuper, false);
  assert.equal(role.rolbypassrls, false);
  assert.equal(role.neon_admin, false);
  const tables = await client`
    select relname, relrowsecurity, relforcerowsecurity from pg_class
    where relnamespace = 'public'::regnamespace and relname in (
      'households', 'household_members', 'categories', 'accounts',
      'recurring_items', 'monthly_plans', 'monthly_plan_items', 'transactions',
      'balance_snapshots', 'savings_goals', 'monthly_liquidity_snapshots',
      'household_people', 'recurring_item_owners', 'household_incomes'
    )
  `;
  assert.equal(tables.length, 14);
  for (const table of tables) {
    assert.ok(table.relrowsecurity && table.relforcerowsecurity, table.relname);
  }

  try {
    await client.begin(async (sql) => {
      const owner = randomUUID();
      const outsider = randomUUID();
      const sessionId = randomUUID();
      await sql`insert into public."user" (id, name, email, email_verified)
        values (${owner}, 'Synthetic owner', ${owner + "@example.test"}, true),
               (${outsider}, 'Synthetic outsider', ${outsider + "@example.test"}, true)`;
      await sql`insert into public.account (id, issuer, account_id, provider_id, user_id)
        values (${randomUUID()}, 'https://accounts.google.com', ${owner}, 'google', ${owner})`;
      await sql`insert into public.session (id, token, user_id, expires_at, updated_at)
        values (${sessionId}, ${randomUUID()}, ${owner}, now() + interval '1 hour', now())`;
      const sessions =
        await sql`select id from public.session where id = ${sessionId}`;
      assert.equal(sessions.length, 1);
      await sql`update public.session set updated_at = now() where id = ${sessionId}`;
      await sql`delete from public.session where id = ${sessionId}`;

      await sql`select set_config('app.user_id', ${owner}, true)`;
      const [household] =
        await sql`insert into public.households (name, owner_user_id)
        values ('Synthetic integration household', ${owner}) returning id`;
      await sql`insert into public.categories (household_id, name, kind)
        values (${household.id}, 'Synthetic category', 'expense')`;
      assert.equal(
        (await sql`select id from public.households where id = ${household.id}`)
          .length,
        1,
      );
      await sql`select set_config('app.user_id', ${outsider}, true)`;
      assert.equal(
        (await sql`select id from public.households where id = ${household.id}`)
          .length,
        0,
      );
      assert.equal(
        (
          await sql`select id from public.categories where household_id = ${household.id}`
        ).length,
        0,
      );
      assert.equal(
        (
          await sql`update public.households set name = 'Forbidden' where id = ${household.id} returning id`
        ).length,
        0,
      );
      await sql`select set_config('app.user_id', ${owner}, true)`;
      await sql`insert into public.household_members (household_id, user_id) values (${household.id}, ${outsider})`;
      await sql`select set_config('app.user_id', ${outsider}, true)`;
      assert.equal(
        (await sql`select id from public.households where id = ${household.id}`)
          .length,
        1,
      );
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  const [context] =
    await client`select nullif(current_setting('app.user_id', true), '') as user_id`;
  assert.equal(context.user_id, null);
  console.log(
    "Neon: runtime-roll, auth-tabeller, sessioner, RLS och transaktionsisolering verifierade. Testdata återställd via rollback.",
  );
} catch (error) {
  // Database errors can contain query parameters; never print credentials or row data.
  console.error(
    "Databaskontrollen misslyckades:",
    error instanceof assert.AssertionError
      ? error.message
      : error.code || error.name,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
