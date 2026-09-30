import { revalidateTag } from "next/cache";
import { TEMPLATES_CACHE_TAG } from "@/features/templates/load-templates";
import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import {
  deleteTemplate,
  getTemplateEditor,
  listTemplates,
} from "@/server/templates";

/**
 * DELETE /api/admin/templates/<id> — template editors only. Removes the
 * template's files and index entry. A design that is still for sale as a
 * WooCommerce product is refused: trash the product in WP admin first, so the
 * shop and the app never disagree.
 */
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/admin/templates/[id]">,
): Promise<Response> {
  if (!(await getTemplateEditor()))
    return Response.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const storage = getStorage();
    const meta = (
      await listTemplates({ includeUnpublished: true }, storage)
    ).find((t) => t.id === id);
    if (!meta) return Response.json({ error: "Not found" }, { status: 404 });
    if (meta.product) {
      const live = await getCommerce().getDesignProduct(id);
      if (live)
        return Response.json(
          {
            error:
              "This design is a shop product. Move it to Trash in WP admin first, then delete it here.",
          },
          { status: 409 },
        );
    }
    await deleteTemplate(id, storage);
    revalidateTag(TEMPLATES_CACHE_TAG, { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[templates] delete failed", err);
    return Response.json(
      { error: "Couldn't delete the template" },
      { status: 500 },
    );
  }
}
