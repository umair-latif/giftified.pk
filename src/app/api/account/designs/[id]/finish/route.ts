import { finishSave, savedDesignsResponse } from "@/server/saved-designs";

/** POST /api/account/designs/<id>/finish — step 2: photos are up, keep it. */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/account/designs/[id]/finish">,
): Promise<Response> {
  const { id } = await ctx.params;
  const body: unknown = await req.json().catch(() => ({}));
  return savedDesignsResponse("finish", (customerId, deps) =>
    finishSave(customerId, id, body, deps),
  );
}
