import type { ReactNode } from "react";
import { chipClass } from "@/components/ui/button";
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
  onReplace: () => void;
  onCentre: () => void;
  onStraighten: () => void;
  /** Already level: Straighten has nothing to do. */
  straight: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onMore: () => void;
  /** Designers only, photos: open the "customer's photo" sheet. */
  customerPhoto?: { active: boolean; onOpen: () => void };
}

/**
 * Context bar shown above the main toolbar while something is selected.
 * Text: font, colour, bold / italic / underline. Photo: crop & shape, replace.
 * Both: copy, delete; plus a small Centre / Straighten row just above.
 */
export function SelectionBar({
  kind,
  text,
  onTextStyle,
  onCrop,
  onReplace,
  onCentre,
  onStraighten,
  straight,
  onCopy,
  onDelete,
  onMore,
  customerPhoto,
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
      className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 border-t border-zinc-200 bg-white lg:relative lg:inset-x-auto lg:bottom-auto lg:rounded-2xl lg:border lg:shadow-sm"
    >
      {/* Position: its own small row just above the tools (phone: floating
          over the page; desktop: the top of the panel). */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center gap-2 pb-2 lg:pointer-events-auto lg:static lg:justify-start lg:border-b lg:border-zinc-200 lg:px-1.5 lg:py-2"
        data-testid="position-row"
      >
        <button
          type="button"
          onClick={onCentre}
          className={`${chipClass} pointer-events-auto`}
        >
          <CentreIcon />
          Centre
        </button>
        <button
          type="button"
          onClick={onStraighten}
          disabled={straight}
          className={`${chipClass} pointer-events-auto`}
        >
          <StraightenIcon />
          Straighten
        </button>
      </div>
      <div
        className="mx-auto flex h-12 max-w-md items-center gap-0.5 overflow-x-auto px-1.5 lg:h-auto lg:max-w-none lg:flex-wrap lg:overflow-visible lg:py-1.5"
        data-testid="selection-bar-row"
      >
        {kind === "text" && text && (
          <>
            <button
              type="button"
              aria-label="More"
              aria-haspopup="dialog"
              onClick={onMore}
              className="focus-visible:ring-brand-600/20 grid size-9 shrink-0 place-items-center rounded-md text-base font-semibold text-zinc-700 italic hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100"
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
              className="h-9 w-14 shrink-0 rounded-md border border-zinc-300 bg-white px-1 text-sm text-zinc-800 lg:w-28"
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
            <Action label="Replace" onClick={onReplace}>
              <ReplaceIcon />
            </Action>
            {customerPhoto && (
              <Toggle
                label="Customer's photo"
                pressed={customerPhoto.active}
                onClick={customerPhoto.onOpen}
              >
                <CustomerPhotoIcon />
              </Toggle>
            )}
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
      className={`focus-visible:ring-brand-600/20 grid size-9 shrink-0 place-items-center rounded-md text-base focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35 ${
        pressed
          ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
          : "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-100"
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
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`focus-visible:ring-brand-600/20 flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-[10px] leading-none font-medium hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 disabled:opacity-35 disabled:hover:bg-transparent ${
        danger ? "text-red-600" : "text-zinc-700"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function ReplaceIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

function CentreIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** A tilted line coming level. */
function StraightenIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 18h18" />
      <path d="M5 13l12-6" strokeDasharray="2 3" />
    </svg>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-zinc-200" />;
}

/** A portrait in a frame: "the customer's own photo goes here". */
function CustomerPhotoIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5" />
    </svg>
  );
}
