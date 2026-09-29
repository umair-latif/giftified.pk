"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductConfig } from "@/config/products";
import { useCart } from "@/features/cart/cart";
import { importTemplate } from "@/features/templates/import-template";
import { DesignEditor } from "./design-editor";
import { loadDraft } from "../draft";

/**
 * `/design/<product>` edits the product's draft; `?item=<cart line id>` edits
 * that cart line's design instead.
 */
export function EditorEntry({ product }: { product: ProductConfig }) {
  const params = useSearchParams();
  const itemId = params.get("item");
  const templateId = params.get("template");
  const cart = useCart();
  const template = useTemplateStart(product, templateId);
  if (templateId) return <TemplateStart state={template} product={product} />;
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
      <Link
        href="/cart"
        className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
      >
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
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 mt-4 inline-flex h-12 items-center rounded-full px-5 font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            Design your own
          </Link>
        </>
      )}
    </main>
  );
}
