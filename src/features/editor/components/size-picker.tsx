"use client";

export interface SizeOption {
  size: string;
  /** False when this size is sold out in the chosen colour. */
  inStock: boolean;
}

/** Garment size chips (radio group, finger-sized). Hidden when there are no sizes. */
export function SizePicker({
  options,
  value,
  onChange,
}: {
  options: readonly SizeOption[];
  value: string | undefined;
  onChange: (size: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1" data-testid="size-picker">
      <span className="text-ink/80 text-xs font-semibold">
        Size: <span className="font-normal">{value ?? "choose your size"}</span>
      </span>
      <div role="radiogroup" aria-label="Size" className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.size === value;
          return (
            <button
              key={o.size}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!o.inStock}
              data-testid={`size-${o.size}`}
              onClick={() => onChange(o.size)}
              className={`disabled:text-ink/40 h-11 min-w-11 rounded-full border px-3 text-sm font-semibold disabled:line-through ${
                on
                  ? "border-ink bg-ink text-white"
                  : "border-ink/25 text-ink bg-white"
              }`}
            >
              {o.size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pure: the sizes on offer in one colour, in catalog order. */
export function sizeOptionsFor(
  variants: readonly { colourId: string; size?: string; inStock: boolean }[],
  colourId: string,
): SizeOption[] {
  const seen = new Map<string, SizeOption>();
  for (const v of variants)
    if (v.size && v.colourId === colourId && !seen.has(v.size))
      seen.set(v.size, { size: v.size, inStock: v.inStock });
  return [...seen.values()];
}
