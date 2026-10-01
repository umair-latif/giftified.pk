import { getStorage } from "@/lib/storage";
import {
  SampleError,
  addSample,
  getTemplateEditor,
  samplesWithUrls,
} from "@/server/templates";

/** GET /api/admin/samples — designers only: the sample photo library, newest first. */
export async function GET(): Promise<Response> {
  if (!(await getTemplateEditor()))
    return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json(
    { samples: await samplesWithUrls(getStorage()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/admin/samples (multipart) — designers only. Fields: `photo` (the
 * ≤2048 px copy made on the phone), `widthPx`, `heightPx`.
 */
export async function POST(req: Request): Promise<Response> {
  const designer = await getTemplateEditor();
  if (!designer)
    return Response.json({ error: "Not allowed" }, { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form" }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof Blob))
    return Response.json({ error: "Add a photo" }, { status: 400 });
  try {
    const sample = await addSample(
      {
        bytes: new Uint8Array(await photo.arrayBuffer()),
        contentType: photo.type,
        widthPx: Number(form.get("widthPx")),
        heightPx: Number(form.get("heightPx")),
        createdBy: designer.email,
      },
      getStorage(),
    );
    return Response.json(sample, { status: 201 });
  } catch (err) {
    if (err instanceof SampleError)
      return Response.json({ error: err.message }, { status: 400 });
    console.error("[samples] upload failed", err);
    return Response.json({ error: "Couldn't save the photo" }, { status: 500 });
  }
}
