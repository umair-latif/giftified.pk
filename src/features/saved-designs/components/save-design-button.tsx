"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductConfig } from "@/config/products";
import { useSignedIn } from "@/features/auth/signed-in";
import {
  getDraftSaved,
  getDraftTemplate,
  setDraftSaved,
} from "@/features/editor/draft";
import type { DesignDocument } from "@/types/design";
import { saveToMyDesigns } from "../save-design";

type State =
  | { kind: "idle" }
  | { kind: "saving"; progress?: string }
  | { kind: "saved"; name: string }
  | { kind: "error"; message: string; signedOut?: boolean };

const chip =
  "focus-visible:ring-brand-600/20 inline-flex h-9 items-center rounded-xl border-2 border-ink bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-300 disabled:hover:bg-white";

/**
 * "Save to my designs" (task 22). Signed out: a link to sign in that comes
 * back to this editor (the draft is kept on the phone meanwhile). Signed in:
 * uploads the design and photos to the account; saving again updates the
 * same saved design.
 */
export function SaveDesignButton({
  product,
  getDesign,
  designKey,
  returnTo,
  disabled,
}: {
  product: ProductConfig;
  getDesign: () => DesignDocument | null;
  /** The cart design being edited, when not the product's draft. */
  designKey?: string;
  /** Where sign-in comes back to (defaults to the product's editor). */
  returnTo?: string;
  disabled?: boolean;
}) {
  const signedIn = useSignedIn();
  const [state, setState] = useState<State>({ kind: "idle" });
  const here = returnTo ?? `/design/${product.id}`;

  if (!signedIn)
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(here)}`}
        className={chip}
        data-testid="save-design-sign-in"
      >
        Save to my designs
      </Link>
    );

  async function save() {
    const design = getDesign();
    if (!design) return;
    setState({ kind: "saving" });
    try {
      const ref = getDraftSaved(product.id, designKey);
      const { designThumbnail } = await import("../thumbnail");
      const templateId = designKey ? undefined : getDraftTemplate(product.id);
      const entry = await saveToMyDesigns(
        {
          design,
          ...(ref ? { savedId: ref.id } : {}),
          ...(ref ? {} : { name: defaultName(product) }),
          ...(templateId ? { templateId } : {}),
          thumbnail: await designThumbnail(design),
        },
        {
          onProgress: (done, total) =>
            total > 0 &&
            done < total &&
            setState({
              kind: "saving",
              progress: `photo ${done + 1} of ${total}`,
            }),
        },
      );
      setDraftSaved(product.id, { id: entry.id, name: entry.name }, designKey);
      setState({ kind: "saved", name: entry.name });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Couldn't save your design.",
        ...(status === 401 ? { signedOut: true } : {}),
      });
    }
  }

  return (
    <div className="flex flex-col gap-1" data-testid="save-design">
      <div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={disabled || state.kind === "saving"}
          className={chip}
          data-testid="save-design-button"
        >
          {state.kind === "saving"
            ? `Saving${state.progress ? ` (${state.progress})` : ""}…`
            : "Save to my designs"}
        </button>
      </div>
      <p className="text-xs" role="status" aria-live="polite">
        {state.kind === "saved" && (
          <span className="text-emerald-700" data-testid="save-design-done">
            Saved as “{state.name}”.{" "}
            <Link href="/account/designs" className="font-medium underline">
              My designs
            </Link>
          </span>
        )}
        {state.kind === "error" && (
          <span className="text-red-700">
            {state.message}{" "}
            {state.signedOut && (
              <Link
                href={`/sign-in?next=${encodeURIComponent(here)}`}
                className="font-medium underline"
              >
                Sign in
              </Link>
            )}
          </span>
        )}
      </p>
    </div>
  );
}

/** "Custom Mug · 30 Sep" — the customer can rename it in My designs. */
function defaultName(product: ProductConfig): string {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${product.name} · ${date}`;
}
