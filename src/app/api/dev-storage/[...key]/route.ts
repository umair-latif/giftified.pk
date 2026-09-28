import { getStorage, isMemoryStorage } from "@/lib/storage";

/**
 * Stand-in for R2's presigned URLs while the in-memory dev storage is active
 * (local dev without STORAGE_* vars, demo/e2e builds). 404 otherwise, so it can
 * never expose anything in a real deployment.
 */
async function keyOf(ctx: RouteContext<"/api/dev-storage/[...key]">) {
  const { key } = await ctx.params;
  return key.map(decodeURIComponent).join("/");
}

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/dev-storage/[...key]">,
) {
  if (!isMemoryStorage()) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(await req.arrayBuffer());
  await getStorage().put(await keyOf(ctx), body, {
    contentType: req.headers.get("content-type") ?? undefined,
  });
  return new Response(null, { status: 200 });
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/dev-storage/[...key]">,
) {
  if (!isMemoryStorage()) return new Response("Not found", { status: 404 });
  const storage = getStorage();
  const key = await keyOf(ctx);
  const [body, info] = await Promise.all([storage.get(key), storage.head(key)]);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body as BodyInit, {
    headers: {
      "content-type": info?.contentType ?? "application/octet-stream",
    },
  });
}
