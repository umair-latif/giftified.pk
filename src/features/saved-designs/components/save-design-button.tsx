"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { buttonClass, chipClass } from "@/components/ui/button";
import { BookmarkIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
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

/** How long the "Saved as …" notice stays up. */
const NOTICE_MS = 6000;

/**
 * "Save" (task 22): a small button for the Preview screen's top bar.
 * Signed out: opens a short sheet (why, and that the work stays on this
 * device meanwhile — drafts autosave) with Sign up / Sign in, both coming back
 * here. Signed in: uploads the design and photos to the account (saving again
 * updates the same saved design) and shows a short "Saved as …" notice.
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
  /** Where sign-in / sign-up come back to. */
  returnTo: string;
  disabled?: boolean;
}) {
  const signedIn = useSignedIn();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [askOpen, setAskOpen] = useState(false);
  const next = encodeURIComponent(returnTo);

  // The "Saved" notice clears itself.
  useEffect(() => {
    if (state.kind !== "saved") return;
    const t = setTimeout(() => setState({ kind: "idle" }), NOTICE_MS);
    return () => clearTimeout(t);
  }, [state]);

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

  const saving = state.kind === "saving";
  // The button sits in the sticky (blurred) top bar, which would trap
  // fixed-position children, so the notice and sheet render on <body>.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const layer = (
    <>
      {/* Result notice, just under the top bar. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-30 flex justify-center px-4 lg:top-[calc(4.5rem+env(safe-area-inset-top))]"
      >
        {(state.kind === "saved" ||
          state.kind === "error" ||
          (saving && state.progress)) && (
          <p
            className={`card card-pop pointer-events-auto max-w-sm px-3 py-2 text-sm ${
              state.kind === "error" ? "text-red-700" : "text-ink"
            }`}
            data-testid={
              state.kind === "saved" ? "save-design-done" : undefined
            }
          >
            {state.kind === "saved" && (
              <>
                Saved as “{state.name}”.{" "}
                <Link
                  href="/account/designs"
                  className="text-brand-700 font-semibold underline"
                >
                  My designs
                </Link>
              </>
            )}
            {saving && `Saving ${state.progress}…`}
            {state.kind === "error" && (
              <>
                {state.message}{" "}
                {state.signedOut && (
                  <Link
                    href={`/sign-in?next=${next}`}
                    className="font-semibold underline"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {askOpen && (
        <Sheet title="Save your design" onClose={() => setAskOpen(false)}>
          <div className="space-y-4" data-testid="save-design">
            <p className="text-sm text-zinc-700">
              Sign up to keep designs in your account and open them on any
              phone. Until then, this design stays on this device.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/sign-up?next=${next}`}
                className={buttonClass("primary")}
                data-testid="save-design-sign-up"
              >
                Sign up
              </Link>
              <Link
                href={`/sign-in?next=${next}`}
                className={buttonClass("secondary")}
                data-testid="save-design-sign-in-link"
              >
                I have an account
              </Link>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
  return (
    <>
      <button
        type="button"
        onClick={() => (signedIn ? void save() : setAskOpen(true))}
        disabled={signedIn && (disabled || saving)}
        className={chipClass}
        data-testid={signedIn ? "save-design-button" : "save-design-sign-in"}
        aria-haspopup={signedIn ? undefined : "dialog"}
      >
        <BookmarkIcon width={16} height={16} />
        {saving ? "Saving…" : "Save"}
      </button>
      {mounted && createPortal(layer, document.body)}
    </>
  );
}

function noop() {
  return () => {};
}

/** "Custom Mug · 30 Sep" — the customer can rename it in My designs. */
function defaultName(product: ProductConfig): string {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${product.name} · ${date}`;
}
