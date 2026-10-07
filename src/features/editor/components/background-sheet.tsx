"use client";

import { useEffect, useRef } from "react";
import { Sheet } from "@/components/ui/sheet";
import { BACKGROUND_SWATCHES } from "@/config/colours";
import { HexField } from "./text-colour-picker";

interface Props {
  /** Current background colour, or null for none. */
  value: string | null;
  onChange: (colour: string | null) => void;
  onClose: () => void;
}

const TILE =
  "focus-visible:ring-brand-600/40 relative size-10 rounded-full ring-1 ring-zinc-300 hover:ring-2 hover:ring-zinc-400 focus-visible:ring-2 focus-visible:outline-none";
const PICKED = "outline-ink outline-[3px] outline-offset-2";

/**
 * Background (tool "Colour"): fills the whole print area with a solid colour.
 * Each tap applies at once (one undo step) and the sheet stays open, so the
 * customer can try colours against the canvas above. Later background kinds
 * (gradients, patterns, textures) can sit next to this one.
 */
export function BackgroundSheet({ value, onChange, onClose }: Props) {
  const current = value?.toLowerCase() ?? null;
  const customRef = useRef<HTMLInputElement>(null);

  // The native picker commits once, when it closes (not on every drag).
  useEffect(() => {
    const el = customRef.current;
    if (!el) return;
    const onCommit = () => onChange(el.value.toLowerCase());
    el.addEventListener("change", onCommit);
    return () => el.removeEventListener("change", onCommit);
  }, [onChange]);

  const pick = (hex: string | null) => {
    if (hex?.toLowerCase() !== current) onChange(hex);
  };
  const known = BACKGROUND_SWATCHES.some((s) => s.hex === current);

  return (
    <Sheet title="Background colour" onClose={onClose}>
      <div
        role="group"
        aria-label="Background colour"
        data-testid="background-panel"
        className="mx-auto max-w-md space-y-3"
      >
        <div className="grid grid-cols-6 justify-items-center gap-3 sm:grid-cols-9">
          <button
            type="button"
            aria-label="No background"
            aria-pressed={current === null}
            onClick={() => pick(null)}
            className={`${TILE} overflow-hidden bg-white ${current === null ? PICKED : ""}`}
          >
            {/* A red slash: "nothing". */}
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-red-500"
            />
          </button>
          {BACKGROUND_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              aria-label={s.name}
              aria-pressed={s.hex === current}
              onClick={() => pick(s.hex)}
              className={`${TILE} ${s.hex === current ? PICKED : ""}`}
              style={{ backgroundColor: s.hex }}
            />
          ))}
          <label
            className={`${TILE} cursor-pointer bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ${current && !known ? PICKED : ""}`}
            title="Custom colour"
          >
            <span className="sr-only">Custom colour</span>
            <input
              ref={customRef}
              type="color"
              defaultValue={current ?? "#ffe135"}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        <HexField
          key={current ?? "none"}
          id="background-hex"
          value={current ?? "#ffffff"}
          onApply={pick}
        />
        <p className="text-xs text-zinc-500">
          Fills the whole print area, edge to edge.
        </p>
      </div>
    </Sheet>
  );
}
