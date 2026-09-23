// @vitest-environment node

import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { account, schema, user, session, households } from "@/db/schema";

const delivery = vi.hoisted(() => ({
  emails: [] as { to: string; actionUrl: string }[],
  tasks: [] as Promise<unknown>[],
}));

vi.mock("@/db", () => ({ db: database }));
vi.mock("next/server", () => ({
  after: (callback: () => Promise<unknown>) => {
    delivery.tasks.push(callback());
  },
}));
vi.mock("@/lib/auth/email", () => ({
  sendAuthEmail: async (email: { to: string; actionUrl: string }) => {
    delivery.emails.push(email);
  },
}));

const client = new PGlite("memory://");
const database = drizzle(client, { schema });
const password = "synthetic-integration-password-123";
let auth: typeof import("./auth").auth;

beforeAll(async () => {
  vi.stubEnv("DATABASE_PROVIDER", "pglite");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "synthetic-integration-secret-only-for-tests",
  );
  vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-google-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "synthetic-google-secret");
  vi.stubEnv("RESEND_API_KEY", "synthetic-email-key");
  vi.stubEnv("AUTH_EMAIL_FROM", "test@example.test");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "");

  // Upgrade a populated 1.7.2 database through the real migration runner.
  const folder = await mkdtemp(join(tmpdir(), "hemekonomi-auth-migrations-"));
  try {
    await cp("drizzle", folder, { recursive: true });
    const journalPath = join(folder, "meta/_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    journal.entries = journal.entries.filter(
      (entry: { idx: number }) => entry.idx < 9,
    );
    await writeFile(journalPath, JSON.stringify(journal));
    await migrate(database, { migrationsFolder: folder });
    await client.query(
      `insert into "user" (id, name, email, email_verified)
       values ('legacy-user', 'Synthetic existing user', 'legacy@example.test', true)`,
    );
    await client.query(
      `insert into account (id, issuer, account_id, provider_id, user_id, password)
       values ('legacy-account', 'legacy-credential-issuer', 'legacy-user', 'credential', 'legacy-user', $1)`,
      [await hashPassword(password)],
    );
    await migrate(database, { migrationsFolder: "drizzle" });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
  ({ auth } = await import("./auth"));
}, 30_000);

afterAll(async () => {
  await Promise.all(delivery.tasks);
  await client.close();
  vi.unstubAllEnvs();
});

function post(path: string, body: Record<string, unknown>, cookie = "") {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

it("registers, verifies and signs in a new account without an issuer", async () => {
  const email = "signup@example.test";
  const signup = await post("sign-up/email", {
    name: "Synthetic new user",
    email,
    password,
  });
  expect(signup.status).toBe(200);
  const created = await signup.json();
  expect(created.user.emailVerified).toBe(false);
  expect(created.token).toBeNull();

  const [stored] = await database
    .select()
    .from(account)
    .where(eq(account.userId, created.user.id));
  expect(stored.issuer).toBeNull();
  expect(stored.providerId).toBe("credential");
  expect(stored.password).not.toBe(password);

  const unverified = await post("sign-in/email", { email, password });
  expect(unverified.status).toBe(403);
  await Promise.all(delivery.tasks);
  const verification = delivery.emails.find((message) => message.to === email);
  expect(verification).toBeDefined();
  const verified = await auth.handler(new Request(verification!.actionUrl));
  expect(verified.status).toBeLessThan(400);

  const signin = await post("sign-in/email", { email, password });
  expect(signin.status).toBe(200);
  const signedIn = await signin.json();
  expect(signedIn.user.id).toBe(created.user.id);
  expect(signedIn.user.emailVerified).toBe(true);
  expect(signin.headers.get("set-cookie")).toContain(
    "better-auth.session_token=",
  );
});

it("preserves login and legacy issuer data for existing accounts", async () => {
  const response = await post("sign-in/email", {
    email: "legacy@example.test",
    password,
  });
  expect(response.status).toBe(200);
  expect((await response.json()).user.id).toBe("legacy-user");
  const [stored] = await database
    .select()
    .from(account)
    .where(eq(account.id, "legacy-account"));
  expect(stored.issuer).toBe("legacy-credential-issuer");
});

it("allows the same subject at different providers but rejects duplicate provider accounts", async () => {
  await database.insert(account).values({
    id: "synthetic-google-account",
    accountId: "legacy-user",
    providerId: "google",
    userId: "legacy-user",
  });
  await expect(
    database.insert(account).values({
      id: "duplicate-google-account",
      accountId: "legacy-user",
      providerId: "google",
      userId: "legacy-user",
    }),
  ).rejects.toMatchObject({
    cause: { code: "23505", constraint: "account_provider_account_id_uidx" },
  });
});

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

it("requires the current password, rotates the session and revokes other devices", async () => {
  const email = "legacy@example.test";
  const signedIn = await post("sign-in/email", { email, password });
  const otherDevice = await post("sign-in/email", { email, password });
  const cookie = cookies(signedIn);
  const nextPassword = "new-synthetic-password-456";
  const denied = await post(
    "change-password",
    {
      currentPassword: "incorrect-password",
      newPassword: nextPassword,
      revokeOtherSessions: true,
    },
    cookie,
  );
  expect(denied.status).toBe(400);
  expect((await denied.json()).code).toBe("INVALID_PASSWORD");
  expect(
    (
      await post(
        "change-password",
        { currentPassword: password, newPassword: "short" },
        cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await post("change-password", {
        currentPassword: password,
        newPassword: nextPassword,
      })
    ).status,
  ).toBe(401);
  const changed = await post(
    "change-password",
    {
      currentPassword: password,
      newPassword: nextPassword,
      revokeOtherSessions: true,
    },
    cookie,
  );
  expect(changed.status).toBe(200);
  for (const revoked of [cookie, cookies(otherDevice)]) {
    const result = await auth.api.getSession({
      headers: new Headers({ cookie: revoked }),
    });
    expect(result).toBeNull();
  }
  const current = await auth.api.getSession({
    headers: new Headers({ cookie: cookies(changed) }),
  });
  expect(current?.user.id).toBe("legacy-user");
  expect((await post("sign-in/email", { email, password })).status).toBe(401);
  expect(
    (await post("sign-in/email", { email, password: nextPassword })).status,
  ).toBe(200);
});

it("adds a password to the same Google user through a single-use email link", async () => {
  const id = "google-password-user";
  const email = "google-password@example.test";
  await database
    .insert(user)
    .values({ id, name: "Synthetic Google user", email, emailVerified: true });
  await database.insert(account).values({
    id: "google-password-account",
    userId: id,
    providerId: "google",
    accountId: "synthetic-google-subject",
  });
  await database.insert(session).values({
    id: "google-password-session",
    token: "synthetic-google-session",
    userId: id,
    expiresAt: new Date(Date.now() + 86400000),
  });
  const [household] = await database
    .insert(households)
    .values({ name: "Synthetic Google household", ownerUserId: id })
    .returning();
  expect(
    (
      await post("request-password-reset", {
        email,
        redirectTo: "/reset-password",
      })
    ).status,
  ).toBe(200);
  await Promise.all(delivery.tasks);
  const message = delivery.emails.findLast((message) => message.to === email)!;
  expect(message).toBeDefined();
  const callback = await auth.handler(new Request(message.actionUrl));
  const redirect = new URL(callback.headers.get("location")!);
  expect(redirect.pathname).toBe("/reset-password");
  const token = redirect.searchParams.get("token")!;
  expect(
    (
      await post("reset-password", {
        newPassword: password,
        token: "invalid-token",
      })
    ).status,
  ).toBe(400);
  expect(
    (await post("reset-password", { newPassword: password, token })).status,
  ).toBe(200);
  expect(
    (await post("reset-password", { newPassword: password, token })).status,
  ).toBe(400);
  const signedIn = await post("sign-in/email", { email, password });
  expect(signedIn.status).toBe(200);
  expect((await signedIn.json()).user.id).toBe(id);
  const accounts = await database
    .select()
    .from(account)
    .where(eq(account.userId, id));
  expect(accounts.map((entry) => entry.providerId).sort()).toEqual([
    "credential",
    "google",
  ]);
  expect(
    await database
      .select()
      .from(session)
      .where(eq(session.id, "google-password-session")),
  ).toHaveLength(0);
  expect(
    (
      await database
        .select()
        .from(households)
        .where(eq(households.ownerUserId, id))
    )[0].id,
  ).toBe(household.id);
});
