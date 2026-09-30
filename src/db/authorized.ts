import "server-only";

import { sql } from "drizzle-orm";

import { requireSession } from "@/lib/auth/session";

import { db } from "./index";

type TransactionCallback = Parameters<typeof db.transaction>[0];
type TransactionConfig = Parameters<typeof db.transaction>[1];
export type AuthorizedTransaction = Parameters<TransactionCallback>[0];
export type AuthenticatedUser = Awaited<
  ReturnType<typeof requireSession>
>["user"];

export async function withUserDatabase<T>(
  userId: string,
  operation: (transaction: AuthorizedTransaction) => Promise<T>,
  config?: TransactionConfig,
): Promise<T> {
  if (!userId)
    throw new Error("En användaridentitet krävs för databasåtkomst.");

  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('app.user_id', ${userId}, true)`,
    );
    return operation(transaction);
  }, config);
}

export async function withAuthenticatedDatabase<T>(
  operation: (
    transaction: AuthorizedTransaction,
    user: AuthenticatedUser,
  ) => Promise<T>,
  config?: TransactionConfig,
): Promise<T> {
  const session = await requireSession();
  return withUserDatabase(
    session.user.id,
    (transaction) => operation(transaction, session.user),
    config,
  );
}
