// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  categories,
  householdMembers,
  householdPeople,
  householdIncomes,
  recurringItems,
  recurringItemOwners,
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
import { createPersonalHousehold } from "@/features/households/data";
import {
  addExpense,
  addPerson,
  getBudgetData,
  saveIncome,
  removeIncome,
  removeExpense,
} from "@/features/budget/data";
import { monthlySummary } from "@/features/budget/model";

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

describe("budget persistence and isolation", () => {
  let personId: number;
  let expenseId: number;
  let ownerHouseholdId: number;
  let incomeId: number;
  it("saves members, multiple owners and monthly income without duplicates", async () => {
    identity.userId = "owner";
    expect(await addPerson("Kim")).toBe(true);
    expect(await addPerson("Robin")).toBe(true);
    expect(await addPerson("Kim")).toBe(false);
    let data = await getBudgetData();
    personId = data.people[0].id;
    ownerHouseholdId = data.household.id;
    await addExpense({
      name: "Försäkring",
      amount: 120_000,
      period: "2026-09",
      type: "allocated",
      months: 12,
      nextDueOn: "2027-08-31",
      ownerIds: [...data.people.map((person) => person.id), personId],
    });
    await addExpense({
      name: "Hyra",
      amount: 1_000_000,
      period: "2026-09",
      type: "direct",
      months: 1,
      nextDueOn: "",
      ownerIds: [],
    });
    incomeId = await saveIncome({
      name: "Lön",
      amount: 2_000_000,
      startsOn: "2026-09",
      endsOn: null,
    });
    await saveIncome({
      id: incomeId,
      name: "Lön",
      amount: 2_000_000,
      startsOn: "2026-09",
      endsOn: "2026-12",
    });
    await saveIncome({
      name: "Bidrag",
      amount: 100_001,
      startsOn: "2026-09",
      endsOn: null,
    });
    data = await getBudgetData();
    const expense = data.expenses.find((item) => item.name === "Försäkring")!;
    expenseId = expense.id;
    expect(expense.owners).toHaveLength(2);
    expect(expense.nextDueOn).toBe("2027-08-31");
    expect(data.incomes).toHaveLength(2);
    expect(
      monthlySummary("2026-09", data.expenses, data.incomes),
    ).toMatchObject({ totalInOre: 1_010_000, remainingInOre: 1_090_001 });
  });
  it("forces RLS on both new tables", async () => {
    const rows = await client.query<{
      relforcerowsecurity: boolean;
      relrowsecurity: boolean;
    }>(
      "select relforcerowsecurity, relrowsecurity from pg_class where relname in ('household_people', 'recurring_item_owners', 'household_incomes')",
    );
    expect(rows.rows).toHaveLength(3);
    for (const row of rows.rows)
      expect(row).toEqual({ relforcerowsecurity: true, relrowsecurity: true });
  });
  it("hides other households and rejects forged owner IDs atomically", async () => {
    identity.userId = "outsider";
    expect((await getBudgetData()).expenses).toHaveLength(0);
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(householdPeople)).toHaveLength(0);
      expect(await transaction.select().from(recurringItemOwners)).toHaveLength(
        0,
      );
      expect(
        await transaction
          .update(householdPeople)
          .set({ name: "Forbidden" })
          .where(eq(householdPeople.id, personId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(recurringItemOwners)
          .where(eq(recurringItemOwners.recurringItemId, expenseId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      addExpense({
        name: "Forbidden",
        amount: 100,
        period: "2026-09",
        type: "direct",
        months: 1,
        nextDueOn: "",
        ownerIds: [personId],
      }),
    ).rejects.toThrow("Invalid household participants");
    expect((await getBudgetData()).expenses).toHaveLength(0);
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdPeople)
          .values({ householdId: ownerHouseholdId, name: "Forbidden" })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: ownerHouseholdId,
            recurringItemId: expenseId,
            personId,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    expect((await getBudgetData()).incomes).toHaveLength(0);
    await expect(
      saveIncome({
        id: incomeId,
        name: "Forbidden",
        amount: 10,
        startsOn: "2026-09",
        endsOn: null,
      }),
    ).rejects.toThrow("Income not found in household");
    await removeIncome(incomeId);
    await withAuthenticatedDatabase(async (transaction) => {
      expect(await transaction.select().from(householdIncomes)).toHaveLength(0);
      expect(
        await transaction
          .update(householdIncomes)
          .set({ amount: 1 })
          .where(eq(householdIncomes.id, incomeId))
          .returning(),
      ).toHaveLength(0);
      expect(
        await transaction
          .delete(householdIncomes)
          .where(eq(householdIncomes.id, incomeId))
          .returning(),
      ).toHaveLength(0);
    });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(householdIncomes)
          .values({
            householdId: ownerHouseholdId,
            name: "Forbidden",
            amount: 1,
            startsOn: new Date("2026-09-01"),
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    await removeExpense(expenseId);
    identity.userId = "owner";
    expect(
      (await getBudgetData()).expenses.some(
        (expense) => expense.id === expenseId,
      ),
    ).toBe(true);
  });
  it("edits and removes only the selected income source", async () => {
    identity.userId = "owner";
    const incomes = (await getBudgetData()).incomes;
    expect(incomes.find((income) => income.id === incomeId)).toMatchObject({
      endsOn: "2026-12",
      amountInOre: 2_000_000,
    });
    expect(monthlySummary("2027-01", [], incomes).incomeInOre).toBe(100_001);
    await removeIncome(incomeId);
    expect((await getBudgetData()).incomes).toEqual([
      expect.objectContaining({ name: "Bidrag" }),
    ]);
  });
  it("rejects cross-household links even for a user with access to both", async () => {
    identity.userId = "outsider";
    await addPerson("Annan medlem");
    const other = await getBudgetData();
    identity.userId = "member";
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: ownerHouseholdId,
            recurringItemId: expenseId,
            personId: other.people[0].id,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      withAuthenticatedDatabase((transaction) =>
        transaction
          .insert(recurringItemOwners)
          .values({
            householdId: other.household.id,
            recurringItemId: expenseId,
            personId: other.people[0].id,
          })
          .returning(),
      ),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });
  it("removes an expense from the budget while preserving its stored record", async () => {
    identity.userId = "owner";
    await removeExpense(expenseId);
    expect(
      (await getBudgetData()).expenses.some(
        (expense) => expense.id === expenseId,
      ),
    ).toBe(false);
    const [stored] = await withAuthenticatedDatabase((transaction) =>
      transaction
        .select()
        .from(recurringItems)
        .where(eq(recurringItems.id, expenseId)),
    );
    expect(stored.active).toBe(false);
  });
});
