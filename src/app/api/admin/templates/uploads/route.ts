import { z } from "zod";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/features/editor/assets/prepare-image";
import { getStorage } from "@/lib/storage";
import { createTemplateUploads, getTemplateEditor } from "@/server/templates";

const bodySchema = z.object({
  assets: z
    .array(
      z.object({
        assetId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/),
        contentType: z.enum(ACCEPTED_IMAGE_TYPES),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * POST /api/admin/templates/uploads — designers only. Reserves a design id and
 * returns direct-upload URLs for each artwork photo's original and preview.
 * Then POST /api/admin/templates with `meta.id` = that id.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await getTemplateEditor()))
    return Response.json({ error: "Not allowed" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid upload request" }, { status: 400 });
  return Response.json(await createTemplateUploads(parsed.data, getStorage()), {
    status: 201,
  });
}
