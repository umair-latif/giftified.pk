"use client";

import { useEffect, useRef, useState } from "react";
import { TEXT_SWATCHES } from "@/config/colours";
import { hexDigits, parseHexColour } from "@/lib/colour";

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

/**
 * Colour button for the selection bar. Opens a swatch panel just above the
 * bar; each pick is one undo step. The custom picker only commits when the
 * native picker closes, not on every drag (which would flood undo history).
 */
export function TextColourPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const current = value.toLowerCase();

  // Close when tapping anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Native `change` fires once when the OS colour picker closes.
  useEffect(() => {
    const el = customRef.current;
    if (!el) return;
    const onCommit = () => {
      onChange(el.value);
      setOpen(false);
    };
    el.addEventListener("change", onCommit);
    return () => el.removeEventListener("change", onCommit);
  }, [open, onChange]);

  const pick = (hex: string) => {
    if (hex.toLowerCase() !== current) onChange(hex);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        aria-label="Text colour"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="focus-visible:ring-brand-600/20 grid size-9 place-items-center rounded-md hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100"
      >
        <span
          aria-hidden
          className="size-6 rounded-full ring-1 ring-zinc-300 ring-offset-1"
          style={{ backgroundColor: value }}
        />
      </button>
      {open && (
        <div
          role="group"
          aria-label="Choose text colour"
          data-testid="colour-panel"
          className="absolute inset-x-0 bottom-full z-20 border-t border-zinc-200 bg-white px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:top-full lg:bottom-auto lg:mt-2 lg:rounded-2xl lg:border lg:shadow-lg"
        >
          <div className="mx-auto grid max-w-md grid-cols-8 gap-2 lg:grid-cols-6 lg:justify-items-center">
            {TEXT_SWATCHES.map((s) => (
              <button
                key={s.hex}
                type="button"
                aria-label={s.name}
                aria-pressed={s.hex.toLowerCase() === current}
                onClick={() => pick(s.hex)}
                className={`hover:ring-brand-400 focus-visible:ring-brand-600/40 size-9 rounded-full ring-1 ring-zinc-300 hover:ring-2 focus-visible:ring-2 focus-visible:outline-none ${
                  s.hex.toLowerCase() === current
                    ? "outline-brand-600 outline-2 outline-offset-2"
                    : ""
                }`}
                style={{ backgroundColor: s.hex }}
              />
            ))}
            <label
              className="relative grid size-9 cursor-pointer place-items-center rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-1 ring-zinc-300"
              title="Custom colour"
            >
              <span className="sr-only">Custom colour</span>
              <input
                ref={customRef}
                type="color"
                defaultValue={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          {/* key: start fresh whenever the colour changes elsewhere (swatch, undo) */}
          <HexField key={value} value={value} onApply={pick} />
        </div>
      )}
    </div>
  );
}

/** Colour code field: shows the current colour's code; Enter or Apply sets a typed one. */
export function HexField({
  value,
  onApply,
  id = "colour-hex",
}: {
  value: string;
  onApply: (hex: string) => void;
  /** Unique per page when two pickers can exist. */
  id?: string;
}) {
  const [draft, setDraft] = useState(() => hexDigits(value));
  const [touched, setTouched] = useState(false);
  const parsed = parseHexColour(draft);
  const invalid = touched && parsed === null;

  const apply = () => {
    setTouched(true);
    if (parsed) onApply(parsed);
  };

  return (
    <form
      className="mx-auto mt-3 flex max-w-md items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <span
        aria-hidden
        className="size-9 shrink-0 rounded-full ring-1 ring-zinc-300"
        style={{ backgroundColor: parsed ?? value }}
      />
      <label htmlFor={id} className="sr-only">
        Colour code
      </label>
      <div
        className={`flex h-10 flex-1 items-center rounded-md border px-2 font-mono text-sm ${
          invalid ? "border-red-500" : "border-zinc-300"
        }`}
      >
        <span className="text-zinc-400">#</span>
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(
              e.target.value.replace(/^#/, "").toUpperCase().slice(0, 6),
            );
            setTouched(false);
          }}
          maxLength={7}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="h-full w-full min-w-0 bg-transparent px-1 uppercase outline-none"
        />
      </div>
      <button
        type="submit"
        className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 h-10 shrink-0 rounded-md px-3 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
      >
        Apply
      </button>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="sr-only">
          Use a 6-digit colour code like 1D4ED8.
        </p>
      )}
    </form>
  );
}
