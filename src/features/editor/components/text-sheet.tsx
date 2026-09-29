"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { SwatchGrid } from "@/components/ui/swatch";
import { TEXT_SWATCHES } from "@/config/colours";
import { loadPickerFonts } from "../fonts/load-fonts";
import type { TextStyle } from "../engine/text-style";

interface Props {
  text: TextStyle;
  onTextStyle: (style: Partial<TextStyle>) => void;
  onClose: () => void;
}

const OUTLINE_WIDTHS = [
  { id: "off", label: "Off", mm: 0 },
  { id: "thin", label: "Thin", mm: 0.4 },
  { id: "thick", label: "Thick", mm: 0.8 },
] as const;

const ALIGNMENTS = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align centre" },
  { value: "right", label: "Align right" },
] as const;

/**
 * "More" sheet for a selected text layer: the words, alignment and an
 * outline. Font, colour and bold/italic/underline live in the selection bar.
 */
export function TextSheet({ text, onTextStyle, onClose }: Props) {
  // Self-hosted fonts (src/config/fonts.ts) load here, on demand, never on
  // first paint — one face per font, so switching in the bar's picker is instant.
  const { fontWeight, fontStyle } = text;
  useEffect(() => {
    void loadPickerFonts(fontWeight, fontStyle);
  }, [fontWeight, fontStyle]);

  const [draft, setDraft] = useState(text.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // The sheet stays mounted while the customer keeps editing the same
  // layer; a new selection (or an external edit, e.g. undo) should refresh
  // the draft instead of clobbering it on every re-render.
  const lastAppliedText = useRef(text.text);
  useEffect(() => {
    if (text.text !== lastAppliedText.current) {
      setDraft(text.text);
      lastAppliedText.current = text.text;
    }
  }, [text.text]);

  const applyText = () => {
    if (draft !== text.text) {
      lastAppliedText.current = draft;
      onTextStyle({ text: draft });
    }
  };

  const outlineWidth =
    OUTLINE_WIDTHS.find((o) => Math.abs(o.mm - text.strokeWidthMm) < 0.01)
      ?.id ?? "off";
  const outlineColour = text.stroke ?? "#111827";

  return (
    <Sheet title="Text" onClose={onClose}>
      <div className="flex flex-col gap-5 py-1">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600">Words</span>
          <textarea
            ref={inputRef}
            data-testid="text-sheet-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyText}
            enterKeyHint="done"
            rows={2}
            className="min-h-[44px] resize-none rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900"
          />
        </label>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-zinc-600">Alignment</h3>
          <div role="radiogroup" aria-label="Alignment" className="flex gap-2">
            {ALIGNMENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={text.textAlign === a.value}
                aria-label={a.label}
                onClick={() => onTextStyle({ textAlign: a.value })}
                className={`grid h-11 w-11 place-items-center rounded-md text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 ${
                  text.textAlign === a.value
                    ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                    : "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-100"
                }`}
              >
                <AlignIcon value={a.value} />
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-zinc-600">Outline</h3>
          <div
            role="radiogroup"
            aria-label="Outline thickness"
            className="flex gap-2"
          >
            {OUTLINE_WIDTHS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={outlineWidth === o.id}
                onClick={() =>
                  onTextStyle({
                    strokeWidthMm: o.mm,
                    stroke: o.mm > 0 ? outlineColour : text.stroke,
                  })
                }
                className={`h-11 shrink-0 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 ${
                  outlineWidth === o.id
                    ? "border-brand-600 bg-brand-100 text-brand-700 hover:bg-brand-200"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 active:bg-zinc-100"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {outlineWidth !== "off" && (
            <div className="pt-1">
              <SwatchGrid
                label="Outline colour"
                swatches={TEXT_SWATCHES}
                value={outlineColour}
                onChange={(hex) => onTextStyle({ stroke: hex })}
              />
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}

function AlignIcon({ value }: { value: "left" | "center" | "right" }) {
  const lines =
    value === "left"
      ? [
          [3, 3, 21],
          [3, 9, 15],
          [3, 15, 18],
        ]
      : value === "right"
        ? [
            [3, 3, 21],
            [9, 9, 21],
            [6, 15, 21],
          ]
        : [
            [3, 3, 21],
            [6, 9, 18],
            [4.5, 15, 19.5],
          ];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none">
      {lines.map(([x1, y, x2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
