"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SwatchGrid } from "@/components/ui/swatch";
import { useBackToClose } from "@/components/ui/use-back-to-close";
import { useKeyboardInset } from "@/components/ui/use-keyboard-inset";
import { TEXT_SWATCHES } from "@/config/colours";
import { FONTS, fitFace } from "@/config/fonts";
import type { TextStyle } from "../engine/text-style";
import { loadPickerFonts } from "../fonts/load-fonts";
import { faceToggles, textStyleChanges, withRealFace } from "../text-faces";
import { HexField } from "./text-colour-picker";

interface Props {
  /** The selected text as it is on the canvas when the editor opens. */
  text: TextStyle;
  /** Product (or design background) colour, for the preview. */
  background: string;
  /** Done: the changed fields, applied to the canvas as one undo step. */
  onDone: (changes: Partial<TextStyle>) => void;
  /** Cancel: the canvas stays as it was. */
  onCancel: () => void;
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

/** Outline in the preview: px per mm of outline (approximate, the preview has no print scale). */
const PREVIEW_OUTLINE_PX_PER_MM = 3.5;

/**
 * Full-screen text editor ("More" in the selection bar): the words and every
 * text option in one place, with a live preview, so the phone's keyboard can
 * never hide what is being edited. Nothing touches the canvas until Done
 * (one undo step); Cancel or Escape leaves it as it was. Quick changes
 * (font, colour, B/I/U) stay in the selection bar.
 */
export function TextEditor({ text, background, onDone, onCancel }: Props) {
  const [initial] = useState(text);
  const [style, setStyle] = useState(text);
  const change = (c: Partial<TextStyle>) => setStyle((s) => withRealFace(s, c));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyboard = useKeyboardInset();
  useBackToClose(onCancel); // Back = Cancel, not leaving the designer
  const { canBold, canItalic } = faceToggles(style);

  // Every font's face, so the font buttons and the preview are instant.
  const { fontWeight, fontStyle } = style;
  useEffect(() => {
    void loadPickerFonts(fontWeight, fontStyle);
  }, [fontWeight, fontStyle]);

  // A full screen: Escape cancels, and the page behind doesn't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  const done = () => {
    const changes = textStyleChanges(initial, style);
    if (Object.keys(changes).length > 0) onDone(changes);
    else onCancel();
  };

  const outlineWidth =
    OUTLINE_WIDTHS.find((o) => Math.abs(o.mm - style.strokeWidthMm) < 0.01)
      ?.id ?? "off";
  const outlineColour = style.stroke ?? "#111827";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit text"
      data-testid="text-editor"
      // With the keyboard open, fill just the part of the screen still
      // visible, so the header and the words stay in view.
      className="fixed inset-x-0 top-0 bottom-0 z-50 flex bg-white lg:items-center lg:justify-center lg:bg-black/40 lg:p-6"
      style={
        keyboard
          ? {
              top: keyboard.top,
              bottom: "auto",
              height: keyboard.visibleHeight,
            }
          : undefined
      }
    >
      <div className="flex h-full w-full flex-col bg-white pt-[env(safe-area-inset-top)] lg:h-auto lg:max-h-[90vh] lg:max-w-lg lg:rounded-2xl lg:border-[3px] lg:border-zinc-900 lg:pt-0 lg:shadow-[6px_6px_0_var(--color-ink)]">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-2">
          <button
            type="button"
            onClick={onCancel}
            className="focus-visible:ring-brand-600/30 h-11 rounded-xl px-3 text-base font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100"
          >
            Cancel
          </button>
          <h2 className="text-ink text-base font-semibold">Edit text</h2>
          <button
            type="button"
            onClick={done}
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 border-ink h-10 rounded-xl border-2 px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            Done
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Pinned while scrolling down to the options, so every change shows. */}
          <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pt-4 pb-2">
            <div
              data-testid="text-editor-preview"
              aria-hidden
              className="grid max-h-[28dvh] min-h-24 place-items-center overflow-hidden rounded-xl border border-zinc-300 px-4 py-4"
              style={{ backgroundColor: background }}
            >
              <p
                dir="auto"
                className="w-full text-[28px] leading-tight break-words whitespace-pre-wrap"
                style={{
                  fontFamily: style.fontFamily,
                  fontWeight: style.fontWeight,
                  fontStyle: style.fontStyle,
                  textDecoration: style.underline ? "underline" : "none",
                  textAlign: style.textAlign,
                  color: style.text ? style.fill : "#a1a1aa",
                  ...(style.stroke && style.strokeWidthMm > 0
                    ? {
                        WebkitTextStroke: `${style.strokeWidthMm * PREVIEW_OUTLINE_PX_PER_MM}px ${style.stroke}`,
                        paintOrder: "stroke fill",
                      }
                    : {}),
                }}
              >
                {style.text || "Your text"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="text-editor-words"
                className="text-xs font-semibold text-zinc-600"
              >
                Words
              </label>
              {/* One tap instead of deleting letter by letter on a phone. */}
              <button
                type="button"
                disabled={!style.text}
                onPointerDown={(e) => e.preventDefault()} // keep the field focused
                onClick={() => {
                  change({ text: "" });
                  inputRef.current?.focus();
                }}
                className="focus-visible:ring-brand-600/20 -my-2 min-h-11 rounded px-2 text-xs font-medium text-zinc-600 underline hover:text-zinc-900 focus-visible:ring-2 focus-visible:outline-none disabled:text-zinc-300 disabled:no-underline"
              >
                Clear
              </button>
            </div>
            <textarea
              ref={inputRef}
              id="text-editor-words"
              data-testid="text-sheet-input"
              dir="auto"
              value={style.text}
              onChange={(e) => change({ text: e.target.value })}
              // Tapping in selects all the words, so typing replaces them.
              onFocus={(e) => {
                const el = e.currentTarget;
                setTimeout(() => el.select(), 0);
              }}
              rows={2}
              className="min-h-[52px] resize-none rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900"
            />
          </div>

          <Section title="Font">
            <div
              role="group"
              aria-label="Font"
              className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
            >
              {FONTS.map((f) => {
                const face = fitFace(f, style.fontWeight, style.fontStyle);
                const selected = f.family === style.fontFamily;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={f.label}
                    data-testid="text-editor-font"
                    onClick={() => change({ fontFamily: f.family })}
                    className={`focus-visible:ring-brand-600/30 flex h-14 shrink-0 flex-col items-center justify-center rounded-xl border px-3 focus-visible:ring-2 focus-visible:outline-none ${
                      selected
                        ? "border-brand-600 bg-brand-50 ring-brand-600 ring-1"
                        : "border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="text-ink text-lg leading-none"
                      style={{
                        fontFamily: f.family,
                        fontWeight: face.weight,
                        fontStyle: face.style,
                      }}
                    >
                      {f.scripts[0] === "arabic" ? "اردو" : "Aa"}
                    </span>
                    <span className="mt-1 text-[11px] font-medium text-zinc-500">
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Colour">
            <SwatchGrid
              label="Text colour"
              swatches={TEXT_SWATCHES}
              value={style.fill}
              onChange={(fill) => change({ fill })}
            />
            <HexField
              key={style.fill}
              id="text-editor-hex"
              value={style.fill}
              onApply={(fill) => change({ fill })}
            />
          </Section>

          <Section title="Style">
            <div className="flex flex-wrap items-center gap-2">
              <Toggle
                label="Bold"
                pressed={style.fontWeight === "bold"}
                disabled={!canBold}
                onClick={() =>
                  change({
                    fontWeight: style.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
              >
                <span className="font-bold">B</span>
              </Toggle>
              <Toggle
                label="Italic"
                pressed={style.fontStyle === "italic"}
                disabled={!canItalic}
                onClick={() =>
                  change({
                    fontStyle:
                      style.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
              >
                <span className="font-serif italic">I</span>
              </Toggle>
              <Toggle
                label="Underline"
                pressed={style.underline}
                onClick={() => change({ underline: !style.underline })}
              >
                <span className="underline">U</span>
              </Toggle>
              <span aria-hidden className="mx-1 h-7 w-px bg-zinc-200" />
              <div
                role="radiogroup"
                aria-label="Alignment"
                className="flex gap-2"
              >
                {ALIGNMENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={style.textAlign === a.value}
                    aria-label={a.label}
                    onClick={() => change({ textAlign: a.value })}
                    className={`focus-visible:ring-brand-600/20 grid size-11 place-items-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none ${
                      style.textAlign === a.value
                        ? "border-brand-600 bg-brand-100 text-brand-700"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <AlignIcon value={a.value} />
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Outline">
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
                    change({
                      strokeWidthMm: o.mm,
                      stroke: o.mm > 0 ? outlineColour : null,
                    })
                  }
                  className={`focus-visible:ring-brand-600/20 h-11 shrink-0 rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${
                    outlineWidth === o.id
                      ? "border-brand-600 bg-brand-100 text-brand-700"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {outlineWidth !== "off" && (
              <div className="flex flex-col gap-2 pt-3">
                <p className="text-xs text-zinc-600">Outline colour</p>
                <SwatchGrid
                  label="Outline colour"
                  swatches={TEXT_SWATCHES}
                  value={outlineColour}
                  onChange={(hex) => change({ stroke: hex })}
                />
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-zinc-600">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({
  label,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      title={
        disabled ? `This font has no ${label.toLowerCase()} style` : undefined
      }
      onClick={onClick}
      className={`focus-visible:ring-brand-600/20 grid size-11 place-items-center rounded-xl border text-lg focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35 ${
        pressed
          ? "border-brand-600 bg-brand-100 text-brand-700"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
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
