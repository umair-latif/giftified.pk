"use server";

import { revalidatePath } from "next/cache";
import { getSessionCustomerId } from "@/server/auth/cookies";
import {
  deleteSavedDesign,
  renameSavedDesign,
  SavedDesignError,
  savedDesignDeps,
} from "@/server/saved-designs";

/** Server Actions for /account/designs (task 22). Public endpoints: ids and names are validated in the service. */
export type SavedDesignActionResult =
  { ok: true } | { ok: false; message: string };

async function run(
  what: string,
  step: (customerId: number) => Promise<void>,
): Promise<SavedDesignActionResult> {
  const customerId = await getSessionCustomerId();
  if (!customerId) return { ok: false, message: "Please sign in again." };
  try {
    await step(customerId);
    revalidatePath("/account/designs");
    return { ok: true };
  } catch (err) {
    if (err instanceof SavedDesignError)
      return { ok: false, message: err.message };
    console.error(`[saved-designs] ${what} failed`, err);
    return {
      ok: false,
      message: "That didn't work just now. Please try again.",
    };
  }
}

export async function renameSavedDesignAction(
  savedId: string,
  name: string,
): Promise<SavedDesignActionResult> {
  if (typeof savedId !== "string")
    return { ok: false, message: "Invalid design" };
  return run("rename", (c) =>
    renameSavedDesign(c, savedId, name, savedDesignDeps()),
  );
}

export async function deleteSavedDesignAction(
  savedId: string,
): Promise<SavedDesignActionResult> {
  if (typeof savedId !== "string")
    return { ok: false, message: "Invalid design" };
  return run("delete", (c) => deleteSavedDesign(c, savedId, savedDesignDeps()));
}
