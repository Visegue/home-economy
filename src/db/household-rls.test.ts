// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  categories,
  householdMembers,
  households,
  schema,
  user,
} from "./schema";

const client = new PGlite("memory://");
const database = drizzle(client, { schema });

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(user).values([
    {
      id: "owner",
      name: "Ägare",
      email: "owner@example.test",
      emailVerified: true,
    },
    {
      id: "member",
      name: "Medlem",
      email: "member@example.test",
      emailVerified: true,
    },
    {
      id: "outsider",
      name: "Utomstående",
      email: "outsider@example.test",
      emailVerified: true,
    },
  ]);
  await client.exec(`
    create role home_economy_test nologin;
    grant usage on schema public, private to home_economy_test;
    grant select, insert, update, delete on all tables in schema public to home_economy_test;
    grant usage, select on all sequences in schema public to home_economy_test;
  `);
});

afterAll(async () => {
  await client.close();
});

describe("household row-level security", () => {
  it("isolates households while allowing explicit members", async () => {
    const householdId = await database.transaction(async (transaction) => {
      await transaction.execute(sql`set local role home_economy_test`);
      await transaction.execute(
        sql`select set_config('app.user_id', ${"owner"}, true)`,
      );
      const [household] = await transaction
        .insert(households)
        .values({ name: "Testhushåll", ownerUserId: "owner" })
        .returning({ id: households.id });

      const duplicateHousehold = await transaction
        .insert(households)
        .values({ name: "Dubblett", ownerUserId: "owner" })
        .onConflictDoNothing({ target: households.ownerUserId })
        .returning({ id: households.id });

      expect(duplicateHousehold).toHaveLength(0);

      await transaction.insert(householdMembers).values({
        householdId: household.id,
        userId: "member",
      });
      await transaction.insert(categories).values({
        householdId: household.id,
        name: "Boende",
        kind: "expense",
      });

      return household.id;
    });

    const memberHouseholds = await database.transaction(async (transaction) => {
      await transaction.execute(sql`set local role home_economy_test`);
      await transaction.execute(
        sql`select set_config('app.user_id', ${"member"}, true)`,
      );
      return transaction.select().from(households);
    });

    const outsiderHouseholds = await database.transaction(
      async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        await transaction.execute(
          sql`select set_config('app.user_id', ${"outsider"}, true)`,
        );
        return transaction.select().from(households);
      },
    );

    expect(memberHouseholds).toHaveLength(1);
    expect(memberHouseholds[0]?.id).toBe(householdId);
    expect(outsiderHouseholds).toHaveLength(0);
  });
});
