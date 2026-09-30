import "server-only";
import { getCommerce } from "@/lib/commerce";
import { newId } from "@/lib/id";
import { getStorage } from "@/lib/storage";
import { getSessionCustomerId } from "@/server/auth/cookies";
import { SavedDesignError, type SavedDesignDeps } from "./service";

export * from "./service";

export function savedDesignDeps(): SavedDesignDeps {
  return {
    commerce: getCommerce(),
    storage: getStorage(),
    now: Date.now,
    makeId: newId,
  };
}

/**
 * Runs a saved-designs step for the signed-in customer and turns the result
 * into a JSON response (401 when signed out, the error's status for expected
 * problems, 500 otherwise).
 */
export async function savedDesignsResponse(
  what: string,
  run: (customerId: number, deps: SavedDesignDeps) => Promise<unknown>,
  status = 200,
): Promise<Response> {
  const customerId = await getSessionCustomerId();
  if (!customerId)
    return Response.json(
      { error: "Please sign in to use My designs." },
      { status: 401 },
    );
  try {
    return Response.json(await run(customerId, savedDesignDeps()), { status });
  } catch (err) {
    if (err instanceof SavedDesignError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error(`[saved-designs] ${what} failed`, err);
    return Response.json(
      { error: "Couldn't reach My designs just now. Please try again." },
      { status: 500 },
    );
  }
}
