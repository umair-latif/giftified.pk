"use client";

import { useEffect, useRef, useState } from "react";
import { FONTS, fitFace, type FontOption } from "@/config/fonts";
import { loadPickerFonts } from "../fonts/load-fonts";
import type { TextStyle } from "../engine/text-style";

interface Props {
  text: TextStyle;
  onChange: (fontFamily: string) => void;
}

/** Longest preview line; the rest of a long text is cut with an ellipsis. */
const PREVIEW_CHARS = 28;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/**
 * What a font's row shows: the customer's own text (first line), so they see
 * their words in each font. Urdu fonts show an Urdu sample until the text has
 * Urdu letters (that's what they're for; Nastaliq has no Latin at all).
 */
export function previewText(font: FontOption, text: string): string {
  const line = (text.split("\n").find((l) => l.trim()) ?? "").trim();
  if (font.scripts[0] === "arabic" && !ARABIC_SCRIPT.test(line))
    return "اردو میں لکھیں";
  if (!line) return "Your text";
  return line.length > PREVIEW_CHARS
    ? `${line.slice(0, PREVIEW_CHARS).trimEnd()}…`
    : line;
}

/**
 * Font button for the selection bar. Opens a panel just above the bar (like
 * the colour panel) listing every font with the selected text written in it,
 * in the face it would get (e.g. no italic for Caveat). A native <select>
 * can't do this: Android draws its options in the system font.
 */
export function FontPicker({ text, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = FONTS.find((f) => f.family === text.fontFamily) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    // Load every font's face now, so the previews (and the switch) are instant.
    if (!open) void loadPickerFonts(text.fontWeight, text.fontStyle);
    setOpen((o) => !o);
  };

  const pick = (font: FontOption) => {
    if (font.family !== text.fontFamily) onChange(font.family);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        aria-label={`Font: ${current?.label ?? "Custom"}`}
        aria-expanded={open}
        aria-haspopup="true"
        data-testid="font-button"
        onClick={toggle}
        onPointerEnter={() =>
          void loadPickerFonts(text.fontWeight, text.fontStyle)
        }
        className="focus-visible:ring-brand-600/20 flex h-9 w-14 items-center justify-between gap-0.5 rounded-md border border-zinc-300 bg-white pr-1 pl-2 text-sm text-zinc-800 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none lg:w-28"
      >
        {/* Phone: "Aa" in the current font (the bar is tight at 360 px);
            desktop: the font's name. */}
        <span
          aria-hidden
          className="truncate text-base lg:hidden"
          style={{ fontFamily: text.fontFamily }}
        >
          Aa
        </span>
        <span
          className="hidden truncate lg:inline"
          style={{ fontFamily: text.fontFamily }}
        >
          {current?.label ?? "Custom"}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          width={16}
          height={16}
          className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          role="group"
          aria-label="Choose font"
          data-testid="font-panel"
          className="absolute inset-x-0 bottom-full z-20 max-h-[45dvh] overflow-y-auto overscroll-contain border-t border-zinc-200 bg-white px-2 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:top-full lg:bottom-auto lg:mt-2 lg:max-h-[60vh] lg:rounded-2xl lg:border lg:shadow-lg"
        >
          <ul className="mx-auto max-w-md space-y-1">
            {FONTS.map((f) => {
              const face = fitFace(f, text.fontWeight, text.fontStyle);
              const selected = f.family === text.fontFamily;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={f.label}
                    data-testid="font-option"
                    onClick={() => pick(f)}
                    className={`focus-visible:ring-brand-600/30 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 ${
                      selected ? "bg-brand-50 ring-brand-600 ring-2" : ""
                    }`}
                  >
                    <span
                      data-testid="font-preview"
                      dir="auto"
                      className={`text-ink min-w-0 flex-1 truncate text-xl ${
                        // Nastaliq's tall letters need room or the row clips them.
                        f.scripts[0] === "arabic"
                          ? "py-1 leading-[2]"
                          : "leading-snug"
                      }`}
                      style={{
                        fontFamily: f.family,
                        fontWeight: face.weight,
                        fontStyle: face.style,
                      }}
                    >
                      {previewText(f, text.text)}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-zinc-500">
                      {f.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
