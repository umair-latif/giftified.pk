"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTemplateEditor } from "../use-template-editor";

/** "Delete" under a template card; shown to template editors only. */
export function DeleteTemplateButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const editor = useTemplateEditor();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!editor) return null;

  async function remove() {
    if (!window.confirm(`Delete the template "${name}"? This can't be undone.`))
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/templates/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        router.refresh();
        return;
      }
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Couldn't delete the template");
    } catch {
      setError("Couldn't delete the template");
    }
    setBusy(false);
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        data-testid="delete-template"
        className="min-h-11 text-sm font-medium text-red-700 underline disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete template"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
