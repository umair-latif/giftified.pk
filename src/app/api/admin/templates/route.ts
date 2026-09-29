import { revalidateTag } from "next/cache";
import { TEMPLATES_CACHE_TAG } from "@/features/templates/load-templates";
import { z } from "zod";
import { getCommerce } from "@/lib/commerce";
import { WooCommerceError } from "@/lib/commerce/woocommerce";
import { getStorage } from "@/lib/storage";
import { appBaseUrl } from "@/server/files/links";
import {
  OCCASION_SLUGS,
  TemplateError,
  getTemplateEditor,
  publishTemplateProduct,
  saveTemplate,
} from "@/server/templates";
import { isDesignDocument } from "@/types/design";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB

const metaSchema = z.object({
  name: z.string().min(1).max(80),
  productId: z.enum(["mug", "tshirt", "hoodie"]),
  occasions: z.array(z.enum(OCCASION_SLUGS)).max(OCCASION_SLUGS.length),
  published: z.boolean(),
  /** Present when publishing as a product (task 26). */
  product: z
    .object({
      description: z.string().min(1).max(2000),
      pricePkr: z.number().int().min(1).max(1_000_000),
    })
    .optional(),
});

/**
 * POST /api/admin/templates (multipart) — template editors only.
 * Fields: `meta` (JSON), `design` (JSON DesignDocument), `thumbnail` (webp),
 * and one `asset:<assetId>` file per photo in the design (its sample photo).
 */
export async function POST(req: Request): Promise<Response> {
  const editor = await getTemplateEditor();
  if (!editor) return Response.json({ error: "Not allowed" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form" }, { status: 400 });
  }
  try {
    const meta = metaSchema.safeParse(JSON.parse(String(form.get("meta"))));
    const design: unknown = JSON.parse(String(form.get("design")));
    if (!meta.success || !isDesignDocument(design, meta.data.productId))
      return Response.json({ error: "Invalid template" }, { status: 400 });

    let total = 0;
    const assets: {
      assetId: string;
      bytes: Uint8Array;
      contentType: string;
    }[] = [];
    let thumbnail: Uint8Array | undefined;
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") continue;
      const bytes = new Uint8Array(await value.arrayBuffer());
      total += bytes.byteLength;
      if (key === "thumbnail") thumbnail = bytes;
      else if (key.startsWith("asset:"))
        assets.push({
          assetId: key.slice("asset:".length),
          bytes,
          contentType: value.type || "image/webp",
        });
    }
    if (total > MAX_BYTES)
      return Response.json({ error: "Template is too large" }, { status: 413 });

    const { product, ...rest } = meta.data;
    const common = {
      ...rest,
      design,
      assets,
      thumbnail,
      createdBy: editor.email,
    };
    let warning: string | undefined;
    let saved;
    if (product) {
      const result = await publishTemplateProduct(
        { ...common, ...product },
        {
          commerce: getCommerce(),
          storage: getStorage(),
          thumbnailUrl: (id) =>
            `${appBaseUrl()}/api/templates/${encodeURIComponent(id)}/thumbnail`,
        },
      );
      saved = result.meta;
      warning = result.warning;
    } else {
      saved = await saveTemplate(common, getStorage());
    }
    // The gallery pages are cached: show the new template right away.
    revalidateTag(TEMPLATES_CACHE_TAG, { expire: 0 });
    return Response.json(
      { ...saved, ...(warning ? { warning } : {}) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof WooCommerceError) {
      console.error("[templates] shop product failed", err);
      return Response.json(
        {
          error:
            "The shop couldn't create the product. Nothing was saved; please try again.",
        },
        { status: 502 },
      );
    }
    if (err instanceof TemplateError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error("[templates] save failed", err);
    return Response.json(
      { error: "Couldn't save the template" },
      { status: 500 },
    );
  }
}
