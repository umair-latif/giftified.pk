"use client";

import type { ProductConfig } from "@/config/products";
import type { BaseColor } from "@/config/products/types";

/**
 * "Shirt colour" / "Hoodie colour": names the garment, so it is never mixed
 * up with the editor's "Background colour" tool.
 */
export function garmentColourLabel(product: ProductConfig): string {
  const id: string = product.id;
  if (id === "tshirt") return "Shirt colour";
  if (id === "hoodie") return "Hoodie colour";
  return `${product.name.replace(/^Custom /, "")} colour`;
}

/** Garment colour swatches (radio group, finger-sized). Hidden for a single colour. */
export function ColourPicker({
  colours,
  value,
  onChange,
  label,
}: {
  colours: readonly BaseColor[];
  value: string;
  onChange: (id: string) => void;
  /** e.g. "Shirt colour" (`garmentColourLabel`). */
  label: string;
}) {
  if (colours.length < 2) return null;
  const current = colours.find((c) => c.id === value) ?? colours[0];
  return (
    <div className="flex items-center gap-3" data-testid="colour-picker">
      <span className="text-ink/80 text-xs font-semibold">
        {label}: <span className="font-normal">{current?.name}</span>
      </span>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {colours.map((c) => {
          const on = c.id === current?.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              data-testid={`colour-${c.id}`}
              onClick={() => onChange(c.id)}
              className={`grid size-11 place-items-center rounded-full`}
            >
              <span
                className={`block size-8 rounded-full ring-2 ring-offset-2 ${
                  on ? "ring-ink ring-[3px]" : "ring-ink/25"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
