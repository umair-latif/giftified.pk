"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";
import type { ProductConfig } from "@/config/products";
import { addDraftToCart, useCart } from "@/features/cart/cart";
import { SaveTemplateSheet } from "@/features/templates/save-template-sheet";
import { useTemplateEditor } from "@/features/templates/use-template-editor";
import { loadDraft, saveThumbnail } from "../draft";
import { DesignPreview, type PreviewResult } from "./design-preview";
import { MissingItem } from "./editor-entry";

/**
 * Preview step. New design → **Add to cart** (snapshot the draft into a cart
 * line). Cart item (`?item=`) → **Save changes** (its design already saved as
 * it was edited; this refreshes the cart thumbnail).
 */
export function PreviewScreen({ product }: { product: ProductConfig }) {
  const router = useRouter();
  const itemId = useSearchParams().get("item");
  const cart = useCart();
  const [result, setResult] = useState<PreviewResult | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canPublish = useTemplateEditor();
  const [publishOpen, setPublishOpen] = useState(false);

  const item = itemId
    ? (cart?.find((i) => i.id === itemId && i.productId === product.id) ?? null)
    : undefined;
  if (itemId && cart === null) return null;
  if (item === null) return <MissingItem />;

  const editHref = `/design/${product.id}${item ? `?item=${encodeURIComponent(item.id)}` : ""}`;
  const blocked = result?.quality.status === "block";
  const canSubmit = !!result && !blocked && !busy;

  async function submit() {
    if (!result) return;
    setBusy(true);
    setError(undefined);
    try {
      const thumbnail = await makeThumbnail(result.src);
      if (item) {
        if (thumbnail) saveThumbnail(item.designKey, thumbnail);
      } else {
        addDraftToCart({
          productId: product.id,
          colourId: product.baseColors[0]?.id ?? "white",
          ...(thumbnail ? { thumbnail } : {}),
        });
      }
      router.push("/cart");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t add it to your cart.",
      );
      setBusy(false);
    }
  }

  const primaryClass =
    "bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 disabled:bg-brand-300 disabled:hover:bg-brand-300 mx-auto flex h-12 w-full max-w-md items-center justify-center rounded-full text-base font-semibold text-white focus-visible:ring-2 focus-visible:outline-none lg:max-w-none";
  // Template editors publish a new design as a product instead of buying it.
  const publishing = canPublish && !item;
  const action = publishing ? (
    <div className="mx-auto w-full max-w-md space-y-1 lg:max-w-none">
      <button
        type="button"
        onClick={() => setPublishOpen(true)}
        disabled={!canSubmit}
        className={primaryClass}
      >
        Publish as product
      </button>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className="focus-visible:ring-brand-600/20 h-9 w-full rounded-full text-sm text-zinc-600 underline hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none disabled:text-zinc-300"
      >
        {busy ? "Saving…" : "Add to cart instead"}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => void submit()}
      disabled={!canSubmit}
      className={primaryClass}
    >
      {busy ? "Saving…" : item ? "Save changes" : "Add to cart"}
    </button>
  );

  return (
    <div className="bg-cream min-h-dvh pb-28 lg:pb-10">
      <AppHeader
        title={item ? "Preview changes" : "Preview"}
        backHref={editHref}
        backLabel="Back to editor"
      />
      <StepBar current="Preview" />
      <main className="mx-auto max-w-md px-4 lg:max-w-[60rem]">
        <DesignPreview
          product={product}
          {...(item ? { designKey: item.designKey } : {})}
          onReady={setResult}
          sideAction={action}
        />
        {blocked && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            A photo is too blurry to print. Go back and make it smaller.
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </main>
      {publishOpen && result && (
        <SaveTemplateSheet
          asProduct
          productId={product.id}
          getDesign={async () => {
            const design = loadDraft(product.id);
            if (!design) return null;
            const flat = await makeThumbnail(result.src, 800);
            // Product images: the design on the product (every mockup view),
            // then the flat artwork.
            const [{ MOCKUP_SPECS }, { composeMockup }] = await Promise.all([
              import("../mockup/specs"),
              import("../mockup/compose"),
            ]);
            const images = await Promise.all(
              (MOCKUP_SPECS[product.id] ?? []).map(async (spec) => ({
                label: spec.label,
                dataUrl: await composeMockup(result.src, product, spec),
              })),
            );
            if (flat) images.push({ label: "Design", dataUrl: flat });
            return { design, thumbnail: flat, images };
          }}
          onClose={() => setPublishOpen(false)}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {action}
      </div>
    </div>
  );
}

/** WebP (≈320 px for the cart: a few KB; wider for a product image) of the rendered design. */
async function makeThumbnail(
  src: string,
  maxWidth = 320,
): Promise<string | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = Math.min(maxWidth, img.naturalWidth);
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const url = c.toDataURL("image/webp", 0.75);
    return url.startsWith("data:image/webp")
      ? url
      : c.toDataURL("image/jpeg", 0.75);
  } catch {
    return null;
  }
}
