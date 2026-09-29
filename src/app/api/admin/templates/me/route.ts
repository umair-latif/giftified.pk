import { getTemplateEditor } from "@/server/templates";

/** GET /api/admin/templates/me — may this browser's account save templates? */
export async function GET(): Promise<Response> {
  const editor = await getTemplateEditor();
  return Response.json(
    { editor: !!editor },
    { headers: { "Cache-Control": "no-store" } },
  );
}
