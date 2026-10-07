"use client";

import type { BaseColor } from "@/config/products/types";

/** Garment colour swatches (radio group, finger-sized). Hidden for a single colour. */
export function ColourPicker({
  colours,
  value,
  onChange,
}: {
  colours: readonly BaseColor[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (colours.length < 2) return null;
  const current = colours.find((c) => c.id === value) ?? colours[0];
  return (
    <div className="flex items-center gap-3" data-testid="colour-picker">
      <span className="text-xs font-medium text-zinc-700">
        Colour: <span className="font-normal">{current?.name}</span>
      </span>
      <div role="radiogroup" aria-label="Garment colour" className="flex gap-2">
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
              className={`focus-visible:ring-brand-600/40 grid size-11 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none`}
            >
              <span
                className={`block size-8 rounded-full ring-2 ring-offset-2 ${
                  on ? "ring-brand-600" : "ring-zinc-300"
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
