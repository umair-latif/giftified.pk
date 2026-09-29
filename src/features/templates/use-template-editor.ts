"use client";

import { useEffect, useState } from "react";

/**
 * True when the signed-in account may save templates (server decides, from
 * TEMPLATE_EDITOR_EMAILS). Guests skip the request: the header script's
 * "signed in" cookie says whether there is anyone to ask about.
 */
export function useTemplateEditor(): boolean {
  const [editor, setEditor] = useState(false);
  useEffect(() => {
    if (!document.cookie.includes("giftified_signed_in=1")) return;
    let stale = false;
    fetch("/api/admin/templates/me")
      .then((r) => (r.ok ? r.json() : { editor: false }))
      .then((d: { editor?: boolean }) => !stale && setEditor(d.editor === true))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);
  return editor;
}
