"use client";

import Link from "next/link";
import { useState } from "react";
import { chipClass } from "@/components/ui/button";
import { BookmarkIcon } from "@/components/ui/icons";
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

/**
 * "Save design" (task 22), a small button. Signed out: the button goes to
 * sign-in (coming back to this editor) with a one-line hint that says why and
 * that the work is safe on this phone meanwhile (drafts autosave). Signed in:
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

  const next = encodeURIComponent(here);

  if (!signedIn)
    return (
      <div className="flex items-center gap-3" data-testid="save-design">
        <Link
          href={`/sign-in?next=${next}`}
          className={chipClass}
          data-testid="save-design-sign-in"
        >
          <BookmarkIcon width={16} height={16} />
          Save design
        </Link>
        <p className="text-xs leading-snug text-zinc-600">
          <Link
            href={`/sign-up?next=${next}`}
            className="text-brand-700 font-semibold underline"
            data-testid="save-design-sign-up"
          >
            Sign up
          </Link>{" "}
          to keep designs in your account. Until then, it stays on this device.
        </p>
      </div>
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
    <div className="flex items-center gap-3" data-testid="save-design">
      <button
        type="button"
        onClick={() => void save()}
        disabled={disabled || state.kind === "saving"}
        className={chipClass}
        data-testid="save-design-button"
      >
        <BookmarkIcon width={16} height={16} />
        {state.kind === "saving"
          ? `Saving${state.progress ? ` (${state.progress})` : ""}…`
          : "Save design"}
      </button>
      <p className="text-xs leading-snug" role="status" aria-live="polite">
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
                href={`/sign-in?next=${next}`}
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
