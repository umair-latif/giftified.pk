"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useState } from "react";
import type { BaseColor } from "@/config/products";
import {
  addTemplateToCart,
  TemplateNeedsPhotoError,
} from "@/features/cart/cart";

interface Props {
  templateId: string;
  productId: "mug" | "tshirt" | "hoodie";
  colours: readonly BaseColor[];
  sizes: string[];
  /** The design still has sample photos: the customer must add their own first. */
  needsPhoto: boolean;
}

const CHIP =
  "focus-visible:ring-brand-600/40 h-10 rounded-full px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none";

/**
 * Colour and size, then **Add to cart** (the design as it is) or
 * **Make it yours** (open it in the editor). After adding: customise it or go to
 * the cart.
 */
export function DesignBuyBox({
  templateId,
  productId,
  colours,
  sizes,
  needsPhoto,
}: Props) {
  const [colourId, setColourId] = useState(colours[0]?.id ?? "white");
  const [size, setSize] = useState<string | undefined>(sizes[0]);
  const [state, setState] = useState<
    "idle" | "adding" | "added" | { error: string }
  >("idle");
  const customizeHref = `/design/${productId}?template=${encodeURIComponent(templateId)}`;

  async function add() {
    setState("adding");
    try {
      await addTemplateToCart({
        templateId,
        productId,
        colourId,
        ...(size ? { size } : {}),
      });
      setState("added");
    } catch (err) {
      setState({
        error:
          err instanceof TemplateNeedsPhotoError
            ? "Add your photo first: tap Make it yours."
            : err instanceof Error
              ? err.message
              : "Couldn’t add it to your cart.",
      });
    }
  }

  return (
    <div className="space-y-4" data-testid="design-buy-box">
      {colours.length > 1 && (
        <fieldset className="space-y-1.5">
          <legend className="text-ink text-sm font-medium">Colour</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {colours.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={colourId === c.id}
                onClick={() => setColourId(c.id)}
                className={`${CHIP} inline-flex items-center gap-2 ring-1 ${
                  colourId === c.id
                    ? "bg-brand-600 ring-brand-600 text-white"
                    : "text-ink bg-white ring-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-zinc-300"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-ink text-sm font-medium">Size</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                onClick={() => setSize(s)}
                className={`${CHIP} ring-1 ${
                  size === s
                    ? "bg-brand-600 ring-brand-600 text-white"
                    : "text-ink bg-white ring-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {state === "added" ? (
        <div
          className="bg-mint-100 space-y-2 rounded-2xl p-4"
          role="status"
          data-testid="added-to-cart"
        >
          <p className="text-brand-900 font-medium">Added to your cart.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/cart" className={buttonClass("primary")}>
              Go to cart
            </Link>
            <Link href={customizeHref} className={buttonClass("secondary")}>
              Make it yours
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {needsPhoto ? (
            <Link href={customizeHref} className={buttonClass("primary")}>
              Make it yours
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void add()}
                disabled={state === "adding"}
                className={buttonClass("primary")}
              >
                {state === "adding" ? "Adding…" : "Add to cart"}
              </button>
              <Link href={customizeHref} className={buttonClass("secondary")}>
                Make it yours
              </Link>
            </>
          )}
        </div>
      )}
      {typeof state === "object" && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
