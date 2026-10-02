"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { logServerError } from "@/lib/server-error-log";
import { removeMember, saveMember } from "./data";
import { memberIdSchema, memberSchema } from "./model";

export interface MemberFormState {
  error?: string;
  success?: string;
}

async function mutate(operation: () => Promise<MemberFormState>) {
  try {
    const result = await operation();
    if (result.success) {
      revalidatePath("/");
      revalidatePath("/salary");
      revalidatePath("/settings");
      revalidatePath("/history");
      revalidatePath("/transfers");
    }
    return result;
  } catch (error) {
    unstable_rethrow(error);
    logServerError({
      error,
      event: "household.member.write.failed",
      reference: randomUUID(),
    });
    return { error: "Det gick inte att spara. Försök igen." };
  }
}

export async function saveMemberAction(
  _state: MemberFormState,
  data: FormData,
): Promise<MemberFormState> {
  const id = memberIdSchema.optional().safeParse(data.get("id") || undefined);
  if (!id.success) return { error: "Medlemmen kunde inte hittas." };
  const parsed = memberSchema.safeParse({
    id: id.data,
    name: data.get("name"),
    color: data.get("color") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return mutate(async () =>
    (await saveMember(parsed.data))
      ? { success: "Medlemmen har sparats." }
      : { error: "Det finns redan en medlem med det namnet." },
  );
}

export async function removeMemberAction(
  _state: MemberFormState,
  data: FormData,
): Promise<MemberFormState> {
  const id = memberIdSchema.safeParse(data.get("id"));
  if (!id.success) return { error: "Medlemmen kunde inte hittas." };
  return mutate(async () => {
    await removeMember(id.data);
    return { success: "Medlemmen har tagits bort." };
  });
}
