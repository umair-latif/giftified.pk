"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductConfig } from "@/config/products";
import { useCart } from "@/features/cart/cart";
import { importTemplate } from "@/features/templates/import-template";
import { DesignEditor } from "./design-editor";
import { openSavedDesign } from "@/features/saved-designs/open-saved-design";
import { getDraftSaved, loadDraft } from "../draft";
import { buttonClass } from "@/components/ui/button";

/**
 * `/design/<product>` edits the product's draft; `?item=<cart line id>` edits
 * that cart line's design instead.
 */
export function EditorEntry({ product }: { product: ProductConfig }) {
  const params = useSearchParams();
  const itemId = params.get("item");
  const templateId = params.get("template");
  const savedId = params.get("saved");
  const cart = useCart();
  const template = useTemplateStart(product, templateId);
  const saved = useSavedStart(product, savedId);
  if (templateId) return <TemplateStart state={template} product={product} />;
  if (savedId) return <SavedStart state={saved} product={product} />;
  if (!itemId) return <DesignEditor product={product} />;
  if (cart === null) return null; // reading the cart after mount
  const item = cart.find((i) => i.id === itemId && i.productId === product.id);
  if (!item) return <MissingItem />;
  return <DesignEditor key={item.designKey} product={product} item={item} />;
}

export function MissingItem() {
  return (
    <main className="mx-auto max-w-md p-6 text-sm" data-testid="missing-item">
      <p className="text-zinc-700">This design is no longer in your cart.</p>
      <Link href="/cart" className={buttonClass("primary", "mt-4")}>
        Go to cart
      </Link>
    </main>
  );
}

type TemplateState = "loading" | "error";

/**
 * `?template=<id>`: start a fresh draft from the template, then drop the
 * parameter so a refresh keeps the customer's work instead of restarting.
 */
function useTemplateStart(
  product: ProductConfig,
  templateId: string | null,
): TemplateState {
  const router = useRouter();
  const [state, setState] = useState<TemplateState>("loading");
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (!templateId || started.current === templateId) return;
    started.current = templateId;
    const home = `/design/${product.id}`;
    const layers = loadDraft(product.id)?.fabric.objects;
    if (
      Array.isArray(layers) &&
      layers.length > 0 &&
      !window.confirm(
        "Start from this template? Your current design will be replaced.",
      )
    ) {
      router.replace(home);
      return;
    }
    importTemplate(templateId, product.id).then(
      () => router.replace(home),
      () => setState("error"),
    );
  }, [templateId, product.id, router]);
  return state;
}

function TemplateStart({
  state,
  product,
}: {
  state: TemplateState;
  product: ProductConfig;
}) {
  return (
    <main className="mx-auto max-w-md p-6 text-sm" data-testid="template-start">
      {state === "loading" ? (
        <p className="text-zinc-500" role="status">
          Loading template…
        </p>
      ) : (
        <>
          <p className="text-zinc-700" role="alert">
            We couldn&apos;t open that template.
          </p>
          <Link
            href={`/design/${product.id}`}
            className={buttonClass("primary", "mt-4")}
          >
            Design your own
          </Link>
        </>
      )}
    </main>
  );
}

type SavedState = "loading" | "error" | "signed-out";

/**
 * `?saved=<id>` (task 22): continue a design from My designs on this device,
 * then drop the parameter so a refresh keeps the customer's work.
 */
function useSavedStart(
  product: ProductConfig,
  savedId: string | null,
): SavedState {
  const router = useRouter();
  const [state, setState] = useState<SavedState>("loading");
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (!savedId || started.current === savedId) return;
    started.current = savedId;
    const home = `/design/${product.id}`;
    const layers = loadDraft(product.id)?.fabric.objects;
    const same = getDraftSaved(product.id)?.id === savedId;
    if (
      !same &&
      Array.isArray(layers) &&
      layers.length > 0 &&
      !window.confirm(
        "Open this saved design? The design you're working on now will be replaced.",
      )
    ) {
      router.replace(home);
      return;
    }
    openSavedDesign(savedId, product.id).then(
      () => router.replace(home),
      (err: unknown) =>
        setState(
          (err as { status?: number }).status === 401 ? "signed-out" : "error",
        ),
    );
  }, [savedId, product.id, router]);
  return state;
}

function SavedStart({
  state,
  product,
}: {
  state: SavedState;
  product: ProductConfig;
}) {
  const link = buttonClass("primary", "mt-4");
  return (
    <main className="mx-auto max-w-md p-6 text-sm" data-testid="saved-start">
      {state === "loading" ? (
        <p className="text-zinc-500" role="status">
          Opening your design…
        </p>
      ) : state === "signed-out" ? (
        <>
          <p className="text-zinc-700" role="alert">
            Sign in to open your saved designs.
          </p>
          <Link href="/sign-in?next=/account/designs" className={link}>
            Sign in
          </Link>
        </>
      ) : (
        <>
          <p className="text-zinc-700" role="alert">
            We couldn&apos;t open that design. Check your connection and try
            again.
          </p>
          <Link href="/account/designs" className={link}>
            Back to My designs
          </Link>
          <Link
            href={`/design/${product.id}`}
            className="mt-3 block text-zinc-600 underline"
          >
            Design something new
          </Link>
        </>
      )}
    </main>
  );
}
