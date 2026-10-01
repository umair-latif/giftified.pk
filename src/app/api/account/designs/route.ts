import { savedDesignsResponse, startSave } from "@/server/saved-designs";

/**
 * POST /api/account/designs — step 1 of "Save to my designs": stores the
 * design as pending and returns direct-upload URLs for its photos (task 22).
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return savedDesignsResponse(
    "start",
    (customerId, deps) => startSave(customerId, body, deps),
    201,
  );
}
