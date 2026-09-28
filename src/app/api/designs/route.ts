import { getStorage } from "@/lib/storage";
import {
  DesignUploadError,
  createDesignUpload,
} from "@/server/designs/create-upload";

/** POST /api/designs — store a design, get direct-upload URLs for its photos. */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    return Response.json(await createDesignUpload(body, getStorage()), {
      status: 201,
    });
  } catch (err) {
    if (err instanceof DesignUploadError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error("[designs] upload failed", err);
    return Response.json(
      { error: "Couldn't save your design. Please try again." },
      { status: 500 },
    );
  }
}
