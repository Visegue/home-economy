// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  categories,
  householdMemberIncome,
  householdMembers,
  households,
  schema,
  user,
} from "./schema";

const identity = vi.hoisted(() => ({ userId: "owner" }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({
    user: { id: identity.userId, name: "Testägare" },
  }),
}));
// Exercise the real authorization helper under a role that cannot bypass RLS.
vi.mock("@/db", () => ({
  db: {
    transaction: (operation: Parameters<typeof database.transaction>[0]) =>
      database.transaction(async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        return operation(transaction);
      }),
  },
}));

import { withAuthenticatedDatabase } from "./authorized";
import {
  getMonthlyNetIncome,
  saveMonthlyNetIncome,
} from "@/features/income/data";
import { createPersonalHousehold } from "@/features/households/data";

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

describe("household writes and transaction context", () => {
  let householdId: number;
  let categoryId: number;

  beforeAll(async () => {
    identity.userId = "outsider";
    const household = await createPersonalHousehold("Isolerat testhushåll");
    householdId = household.id;
    await withAuthenticatedDatabase(async (transaction) => {
      const [category] = await transaction
        .insert(categories)
        .values({
          householdId,
          name: "Testkategori",
          kind: "expense",
        })
        .returning();
      categoryId = category.id;
      await transaction
        .insert(householdMembers)
        .values({ householdId, userId: "member" });
    });
  });

  it("returns one household and one owner membership on repeated creation", async () => {
    identity.userId = "outsider";
    const first = await createPersonalHousehold("Försök igen");
    const second = await createPersonalHousehold("Ännu ett försök");
    expect(first.id).toBe(householdId);
    expect(second).toEqual(first);
    expect(second.name).toBe("Isolerat testhushåll");
    const members = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId)),
    );
    expect(members.filter((member) => member.userId === "outsider")).toEqual([
      expect.objectContaining({ role: "owner", displayName: "Testägare" }),
    ]);
  });

  it("rejects inserts into another household", async () => {
    identity.userId = "owner";
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(categories)
          .values({
            householdId,
            name: "Forbidden",
            kind: "expense",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(households)
          .values({
            ownerUserId: "member",
            name: "Forbidden",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("hides rows from an outsider's reads, updates and deletes", async () => {
    identity.userId = "owner";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId)),
      ).toHaveLength(0);
      expect(
        await transaction
          .update(categories)
          .set({ name: "Forbidden" })
          .where(eq(categories.id, categoryId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(categories)
          .where(eq(categories.id, categoryId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .update(households)
          .set({ name: "Forbidden" })
          .where(eq(households.id, householdId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(households)
          .where(eq(households.id, householdId))
          .returning(),
      ).toHaveLength(0);
    });
    identity.userId = "outsider";
    const rows = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId)),
    );
    expect(rows).toEqual([expect.objectContaining({ name: "Testkategori" })]);
  });

  it("allows member reads but rejects membership administration", async () => {
    identity.userId = "member";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction
          .select()
          .from(categories)
          .where(eq(categories.id, categoryId)),
      ).toHaveLength(1);
      expect(
        await transaction
          .update(householdMembers)
          .set({ role: "owner" })
          .where(eq(householdMembers.householdId, householdId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(householdMembers)
          .where(eq(householdMembers.householdId, householdId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdMembers)
          .values({
            householdId,
            userId: "owner",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("clears identity after commit and rollback and denies access without it", async () => {
    identity.userId = "outsider";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(households)).toHaveLength(1);
    });
    const assertNoContext = () =>
      database.transaction(async (transaction) => {
        await transaction.execute(sql`set local role home_economy_test`);
        const context = await transaction.execute<{ user_id: string | null }>(
          sql`select nullif(current_setting('app.user_id', true), '') as user_id`,
        );
        expect(context.rows[0]?.user_id).toBeNull();
        expect(await transaction.select().from(households)).toHaveLength(0);
        expect(await transaction.select().from(categories)).toHaveLength(0);
      });
    await assertNoContext();
    const rollback = new Error("Synthetic rollback");
    await expect(
      withAuthenticatedDatabase(async (transaction) => {
        await transaction
          .update(categories)
          .set({ name: "Rolled back" })
          .where(eq(categories.id, categoryId));
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    await assertNoContext();
    const rows = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId)),
    );
    expect(rows).toEqual([expect.objectContaining({ name: "Testkategori" })]);
  });
});

describe("personal monthly income", () => {
  let incomeHouseholdId: number;
  let initialIncome: number | null;
  let omittedIncome: number | null;

  beforeAll(async () => {
    await database.insert(user).values(
      ["income-owner", "income-peer", "income-outsider"].map((id) => ({
        id,
        name: "Synthetic income user",
        email: `${id}@example.test`,
        emailVerified: true,
      })),
    );
    identity.userId = "income-owner";
    const household = await createPersonalHousehold(
      "Inkomsthushåll",
      3_250_075,
    );
    incomeHouseholdId = household.id;
    initialIncome = await getMonthlyNetIncome();
    await withAuthenticatedDatabase(async (transaction) => {
      await transaction
        .insert(householdMembers)
        .values({ householdId: incomeHouseholdId, userId: "income-peer" });
    });
    identity.userId = "income-outsider";
    await createPersonalHousehold("Annat inkomsthushåll");
    omittedIncome = await getMonthlyNetIncome();
  });

  beforeEach(async () => {
    identity.userId = "income-owner";
    await saveMonthlyNetIncome(3_250_075);
  });

  it("creates households with or without an initial income", () => {
    expect(initialIncome).toBe(3_250_075);
    expect(omittedIncome).toBeNull();
  });

  it("preserves öre, distinguishes zero from missing and does not overwrite income on repeated onboarding", async () => {
    await createPersonalHousehold("Upprepad onboarding", 100);
    expect(await getMonthlyNetIncome()).toBe(3_250_075);
    await saveMonthlyNetIncome(3_400_029);
    expect(await getMonthlyNetIncome()).toBe(3_400_029);
    await saveMonthlyNetIncome(0);
    expect(await getMonthlyNetIncome()).toBe(0);
    await saveMonthlyNetIncome(null);
    expect(await getMonthlyNetIncome()).toBeNull();
  });

  it("isolates income between households and rejects writing as another member", async () => {
    identity.userId = "income-outsider";
    expect(await getMonthlyNetIncome()).toBeNull();
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction.select().from(householdMemberIncome),
      ).toHaveLength(0);
      expect(
        await transaction
          .update(householdMemberIncome)
          .set({ monthlyNetIncome: "1.00" })
          .where(eq(householdMemberIncome.householdId, incomeHouseholdId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(householdMemberIncome)
          .where(eq(householdMemberIncome.householdId, incomeHouseholdId))
          .returning(),
      ).toHaveLength(0);
    });
    identity.userId = "income-peer";
    await withAuthenticatedDatabase(async (transaction) => {
      expect(
        await transaction
          .select()
          .from(householdMemberIncome)
          .where(eq(householdMemberIncome.householdId, incomeHouseholdId)),
      ).toHaveLength(1);
      expect(
        await transaction
          .update(householdMemberIncome)
          .set({ monthlyNetIncome: "1.00" })
          .where(eq(householdMemberIncome.userId, "income-owner"))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdMemberIncome)
          .values({
            householdId: incomeHouseholdId,
            userId: "income-owner",
            monthlyNetIncome: "1.00",
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    identity.userId = "income-owner";
    expect(await getMonthlyNetIncome()).toBe(3_250_075);
  });

  it("rejects negative amounts in the database and invalid integer amounts at the application boundary", async () => {
    for (const amount of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(saveMonthlyNetIncome(amount)).rejects.toMatchObject({
        name: "ZodError",
      });
    }
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .update(householdMemberIncome)
          .set({ monthlyNetIncome: "-0.01" })
          .where(eq(householdMemberIncome.userId, "income-owner"))
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    expect(await getMonthlyNetIncome()).toBe(3_250_075);
  });
});
