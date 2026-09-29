import type { ReactNode } from "react";
import { CopyIcon, CropIcon, TrashIcon } from "@/components/ui/icons";
import { FONTS, fontForFamily, hasFace } from "@/config/fonts";
import { loadPickerFonts } from "../fonts/load-fonts";
import type { TextStyle } from "../engine/text-style";
import { TextColourPicker } from "./text-colour-picker";

interface Props {
  kind: "text" | "image" | "other";
  text: TextStyle | null;
  onTextStyle: (style: Partial<TextStyle>) => void;
  onCrop: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onMore: () => void;
}

/**
 * Context bar shown above the main toolbar while something is selected.
 * Text: font, colour, bold / italic / underline. Photo: crop. Both: copy, delete.
 */
export function SelectionBar({
  kind,
  text,
  onTextStyle,
  onCrop,
  onCopy,
  onDelete,
  onMore,
}: Props) {
  // Bold/italic only where the font has a REAL face for it (the print can't
  // fake one the way a browser does) — e.g. no italic for Caveat, neither for Urdu.
  const font = text ? fontForFamily(text.fontFamily) : null;
  const canBold =
    !text ||
    !font ||
    hasFace(
      font,
      text.fontWeight === "bold" ? "normal" : "bold",
      text.fontStyle,
    );
  const canItalic =
    !text ||
    !font ||
    hasFace(
      font,
      text.fontWeight,
      text.fontStyle === "italic" ? "normal" : "italic",
    );
  return (
    <div
      role="toolbar"
      aria-label={
        kind === "text"
          ? "Text tools"
          : kind === "image"
            ? "Photo tools"
            : "Selection tools"
      }
      data-testid="selection-bar"
      className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 border-t border-zinc-200 bg-white"
    >
      <div
        className="mx-auto flex h-12 max-w-md items-center gap-0.5 overflow-x-auto px-1.5"
        data-testid="selection-bar-row"
      >
        {kind === "text" && text && (
          <>
            <button
              type="button"
              aria-label="More"
              aria-haspopup="dialog"
              onClick={onMore}
              className="grid size-9 shrink-0 place-items-center rounded-md text-base font-semibold text-zinc-700 italic active:bg-zinc-100"
            >
              Aa
            </button>
            <label className="sr-only" htmlFor="font-select">
              Font
            </label>
            <select
              id="font-select"
              value={
                FONTS.some((f) => f.family === text.fontFamily)
                  ? text.fontFamily
                  : ""
              }
              onFocus={() =>
                void loadPickerFonts(text.fontWeight, text.fontStyle)
              }
              onChange={(e) => onTextStyle({ fontFamily: e.target.value })}
              className="h-9 w-14 shrink-0 rounded-md border border-zinc-300 bg-white px-1 text-sm text-zinc-800"
              style={{ fontFamily: text.fontFamily }}
            >
              {!FONTS.some((f) => f.family === text.fontFamily) && (
                <option value="">Custom</option>
              )}
              {FONTS.map((f) => (
                <option
                  key={f.family}
                  value={f.family}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </option>
              ))}
            </select>
            <TextColourPicker
              value={text.fill}
              onChange={(fill) => onTextStyle({ fill })}
            />
            <Toggle
              label="Bold"
              pressed={text.fontWeight === "bold"}
              disabled={!canBold}
              onClick={() =>
                onTextStyle({
                  fontWeight: text.fontWeight === "bold" ? "normal" : "bold",
                })
              }
            >
              <span className="font-bold">B</span>
            </Toggle>
            <Toggle
              label="Italic"
              pressed={text.fontStyle === "italic"}
              disabled={!canItalic}
              onClick={() =>
                onTextStyle({
                  fontStyle: text.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            >
              <span className="font-serif italic">I</span>
            </Toggle>
            <Toggle
              label="Underline"
              pressed={text.underline}
              onClick={() => onTextStyle({ underline: !text.underline })}
            >
              <span className="underline">U</span>
            </Toggle>
          </>
        )}
        {kind === "image" && (
          <>
            <Action label="Crop" onClick={onCrop}>
              <CropIcon width={20} height={20} />
            </Action>
            <Divider />
          </>
        )}
        <Action label="Copy" onClick={onCopy}>
          <CopyIcon width={20} height={20} />
        </Action>
        <Action label="Delete" onClick={onDelete} danger>
          <TrashIcon width={20} height={20} />
        </Action>
      </div>
    </div>
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
      className={`grid size-9 shrink-0 place-items-center rounded-md text-base disabled:opacity-35 ${
        pressed
          ? "bg-brand-100 text-brand-700"
          : "text-zinc-700 active:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Action({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] leading-none font-medium active:bg-zinc-100 ${
        danger ? "text-red-600" : "text-zinc-700"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-zinc-200" />;
}
