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
} from "@/server/templates";
import { isDesignDocument } from "@/types/design";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB

const metaSchema = z.object({
  /** Reserved by POST /api/admin/templates/uploads when artwork photos were uploaded. */
  id: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
    .optional(),
  name: z.string().min(1).max(80),
  productId: z.enum(["mug", "tshirt", "hoodie"]),
  /** The one colour this design is made and sold in; defaults to the product's first. */
  colourId: z.string().min(1).max(40).optional(),
  /** Same artwork in another colour: pass the first design's `groupId`. */
  groupId: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
    .optional(),
  occasions: z.array(z.enum(OCCASION_SLUGS)).max(OCCASION_SLUGS.length),
  published: z.boolean(),
  /** Labels of the `image:<n>` files (product images), in order. */
  imageLabels: z.array(z.string().max(30)).max(10).optional(),
  /** Every published design is a shop product (task 26). */
  product: z.object({
    description: z.string().min(1).max(2000),
    pricePkr: z.number().int().min(1).max(1_000_000),
  }),
});

/**
 * POST /api/admin/templates (multipart) — designers only.
 * Fields: `meta` (JSON), `design` (JSON DesignDocument), `thumbnail` (webp)
 * and `image:<n>` files: product images (mockups), labelled by
 * `meta.imageLabels`. Photos never come through here: customer's photos are
 * copied from the sample library, artwork originals were uploaded directly
 * (see ./uploads).
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
    let thumbnail: Uint8Array | undefined;
    const imageBytes = new Map<number, Uint8Array>();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") continue;
      const bytes = new Uint8Array(await value.arrayBuffer());
      total += bytes.byteLength;
      if (key === "thumbnail") thumbnail = bytes;
      else if (/^image:\d{1,2}$/.test(key))
        imageBytes.set(Number(key.slice("image:".length)), bytes);
    }
    if (total > MAX_BYTES)
      return Response.json({ error: "Template is too large" }, { status: 413 });

    const { product, imageLabels = [], ...rest } = meta.data;
    const images = [...imageBytes.entries()]
      .sort(([a], [b]) => a - b)
      .map(([i, bytes]) => ({
        label: imageLabels[i] ?? `Image ${i + 1}`,
        bytes,
      }));
    const common = {
      ...rest,
      images,
      design,
      thumbnail,
      createdBy: editor.email,
    };
    const result = await publishTemplateProduct(
      { ...common, ...product },
      {
        commerce: getCommerce(),
        storage: getStorage(),
        thumbnailUrl: (id) =>
          `${appBaseUrl()}/api/templates/${encodeURIComponent(id)}/thumbnail`,
        imageUrl: (id, n) =>
          `${appBaseUrl()}/api/templates/${encodeURIComponent(id)}/images/${n}`,
      },
    );
    const saved = result.meta;
    const warning = result.warning;
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
