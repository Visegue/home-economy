import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { AuthorizedTransaction } from "@/db/authorized";
import { households } from "@/db/schema";

// Call only within withAuthenticatedDatabase, using its authenticated user ID.
export async function readOwnedHousehold(
  transaction: AuthorizedTransaction,
  userId: string,
) {
  const [household] = await transaction
    .select()
    .from(households)
    .where(eq(households.ownerUserId, userId))
    .limit(1);
  if (!household) redirect("/onboarding");
  return household;
}
