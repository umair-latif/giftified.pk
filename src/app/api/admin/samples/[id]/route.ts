import { getStorage } from "@/lib/storage";
import { deleteSample, getTemplateEditor } from "@/server/templates";

/** DELETE /api/admin/samples/<id> — designers only. Published designs keep their own copy. */
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/admin/samples/[id]">,
): Promise<Response> {
  if (!(await getTemplateEditor()))
    return Response.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    return (await deleteSample(id, getStorage()))
      ? new Response(null, { status: 204 })
      : Response.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("[samples] delete failed", err);
    return Response.json({ error: "Couldn't delete it" }, { status: 500 });
  }
}
