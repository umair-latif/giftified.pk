"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { getProduct, type ProductId } from "@/config/products";
import { quoteCart } from "@/features/cart/actions";
import { formatPkr } from "@/features/checkout/format";
import { OCCASIONS } from "@/features/home/occasions";
import type { OccasionSlug } from "@/server/templates/types";
import type { DesignDocument } from "@/types/design";
import {
  buildTemplateForm,
  uploadTemplatePhotos,
  type ProductImage,
} from "./build-template-form";
import { buttonClass } from "@/components/ui/button";

interface Props {
  /** Current design plus a thumbnail render of it. */
  getDesign: () => Promise<{
    design: DesignDocument;
    thumbnail: string | null;
    /** Mockups of the design on the product; the first is the main image. */
    images?: ProductImage[];
  } | null>;
  onClose: () => void;
  /** Publish as a shop product: also asks for a description and a price. */
  asProduct?: boolean;
  /** The base product, so the price field can show what a plain one costs. */
  productId?: ProductId;
}

/** Template editors only: name it, tag occasions, publish (or keep as a draft). */
export function SaveTemplateSheet({
  getDesign,
  onClose,
  asProduct,
  productId,
}: Props) {
  const basePrice = useBasePrice(asProduct ? productId : undefined);
  const [name, setName] = useState("");
  const [occasions, setOccasions] = useState<OccasionSlug[]>([]);
  const [published, setPublished] = useState(!!asProduct);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const pricePkr = Number(price);
  const productReady =
    !asProduct ||
    (description.trim().length > 0 &&
      Number.isInteger(pricePkr) &&
      pricePkr > 0);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "error"; message: string }
    | { kind: "done"; id: string; warning?: string; slug?: string }
  >({ kind: "idle" });

  const toggle = (slug: OccasionSlug) =>
    setOccasions((cur) =>
      cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug],
    );

  async function save() {
    setState({ kind: "saving" });
    try {
      const current = await getDesign();
      if (!current) throw new Error("Nothing to save yet");
      // Artwork originals go straight to storage first (too big for us).
      const id = await uploadTemplatePhotos(current.design);
      const form = await buildTemplateForm(
        current.design,
        {
          ...(id ? { id } : {}),
          name: name.trim(),
          occasions,
          published,
          ...(asProduct
            ? { product: { description: description.trim(), pricePkr } }
            : {}),
        },
        current.thumbnail,
        current.images,
      );
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as {
        id?: string;
        error?: string;
        warning?: string;
        product?: { slug: string };
      };
      if (!res.ok || !body.id) throw new Error(body.error ?? "Couldn't save");
      setState({
        kind: "done",
        id: body.id,
        warning: body.warning,
        slug: body.product?.slug,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't save",
      });
    }
  }

  return (
    <Sheet
      title={asProduct ? "Publish as product" : "Save as template"}
      onClose={onClose}
    >
      {state.kind === "done" ? (
        <div
          className="space-y-2 pt-1 pb-2 text-sm"
          data-testid="template-saved"
        >
          <p className="text-brand-900 font-medium">
            {asProduct ? "Product saved." : "Template saved."}
          </p>
          {state.warning && (
            <p role="alert" className="text-amber-900">
              {state.warning}
            </p>
          )}
          <p className="text-zinc-500">
            {published
              ? "It is published."
              : "It is a draft: only editors can see it until you publish it."}{" "}
            Template id: <code>{state.id}</code>
            {state.slug && published && (
              <>
                {" "}
                <a
                  href={`/designs/${state.slug}`}
                  className="text-brand-700 underline"
                >
                  View the product page
                </a>
              </>
            )}
          </p>
        </div>
      ) : (
        <form
          className="space-y-3 pt-1 pb-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block space-y-1">
            <span className="text-ink font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="focus:border-brand-600 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base"
            />
          </label>
          {asProduct && (
            <>
              <label className="block space-y-1">
                <span className="text-ink font-medium">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  required
                  className="focus:border-brand-600 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-ink font-medium">Price (Rs)</span>
                <input
                  value={price}
                  placeholder={basePrice ? String(basePrice) : undefined}
                  aria-describedby="base-price-hint"
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  required
                  className="focus:border-brand-600 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base"
                />
                {basePrice && (
                  <span
                    id="base-price-hint"
                    className="block text-xs text-zinc-500"
                    data-testid="base-price-hint"
                  >
                    A plain {getProduct(productId!)?.name ?? "product"} costs{" "}
                    {formatPkr(basePrice)}.
                  </span>
                )}
              </label>
            </>
          )}
          <fieldset className="space-y-1">
            <legend className="text-ink font-medium">Occasions</legend>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <label
                  key={o.slug}
                  className={`relative inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-xs font-medium ${
                    occasions.includes(o.slug as OccasionSlug)
                      ? "bg-brand-600 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={occasions.includes(o.slug as OccasionSlug)}
                    onChange={() => toggle(o.slug as OccasionSlug)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="size-5"
            />
            <span>Publish (visible to customers)</span>
          </label>
          <p className="text-xs text-zinc-500">
            Customers can buy it as it is or change anything. Customer&apos;s
            photos must be replaced before they order.
          </p>
          {state.kind === "error" && (
            <p role="alert" className="text-red-700">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={state.kind === "saving" || !name.trim() || !productReady}
            className={buttonClass("primary")}
          >
            {state.kind === "saving"
              ? "Saving…"
              : asProduct
                ? "Publish product"
                : "Save template"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

/** The price of a plain (customer-designed) product, from the store, as a reference for the designer. */
function useBasePrice(productId: ProductId | undefined): number | null {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    const colourId = productId && getProduct(productId)?.baseColors[0]?.id;
    if (!productId || !colourId) return;
    let stale = false;
    quoteCart({ lines: [{ productId, colourId, quantity: 1 }], city: "" })
      .then((q) => !stale && setPrice(q?.unitPricePkr[0] ?? null))
      .catch(() => undefined); // a reference only: the field works without it
    return () => {
      stale = true;
    };
  }, [productId]);
  return price;
}
