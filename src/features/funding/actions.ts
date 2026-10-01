"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { confirmTransfer } from "./data";
import { PeriodWriteError } from "@/features/periods/write";
export interface TransferState {
  error?: string;
  warning?: string;
  success?: string;
}
export async function confirmTransferAction(
  _state: TransferState,
  form: FormData,
): Promise<TransferState> {
  try {
    const result = await confirmTransfer({
      ...Object.fromEntries(form),
      itemId: form.get("itemId") || undefined,
      confirmNegative: form.get("confirmNegative") === "on",
    });
    if (result.warning) return { warning: result.warning };
    revalidatePath("/");
    revalidatePath("/transfers");
    return { success: "Överföringen har registrerats." };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof PeriodWriteError
          ? error.message
          : "Registreringen kunde inte sparas. Försök igen.",
    };
  }
}
