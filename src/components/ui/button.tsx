/**
 * The one button. Every primary / secondary action on the site uses these
 * classes, so height (48 px), shape and width are the same everywhere: full
 * width of its column on a phone, at least 160 px (and as wide as its label)
 * from `sm` up. It is a block (flex) element: use `mx-auto` to centre it.
 *
 * Theme (docs/brand.md): 16px corners, 3px ink outline.
 *  - primary: banana yellow (`action`) with the hard shadow at rest: the one
 *    main action on the screen. Hover leaves it as is (it is already raised).
 *  - secondary: white, outline only; the shadow appears on hover / focus.
 * Pressed: slides 4px into the shadow and drops it (`press`). Focus: the
 * global teal ring. Disabled: page-coloured, faded outline, no shadow.
 */
const BASE =
  "border-ink text-ink press flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[3px] px-6 text-base font-semibold no-underline! disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-page disabled:text-ink/50 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:border-ink/40 aria-disabled:bg-page aria-disabled:text-ink/50 aria-disabled:shadow-none sm:w-fit sm:min-w-40";

/** Colour + shadow of each variant, also used by compact buttons (app header Next, sheet Done). */
export const BUTTON_SKIN = {
  primary: "bg-action shadow-hard",
  secondary: "lift bg-white",
} as const;

const VARIANTS = BUTTON_SKIN;

export type ButtonVariant = keyof typeof VARIANTS;

/** Class string for a `<button>` or `<Link>`; `extra` is for spacing only (e.g. `mt-4`). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]}${extra ? ` ${extra}` : ""}`;
}

/**
 * Compact button (44 px) for actions inside cards, sheets and toolbars, where
 * the full 48 px button is too big. Same skins and states as `buttonClass`.
 */
export function compactButtonClass(
  variant: ButtonVariant = "secondary",
  extra = "",
): string {
  return `${COMPACT} ${VARIANTS[variant]}${extra ? ` ${extra}` : ""}`;
}

const COMPACT =
  "border-ink text-ink press inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border-[3px] px-4 text-sm font-semibold no-underline! disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-page disabled:text-ink/50 disabled:shadow-none";

/**
 * Chip: small secondary action or filter (editor chips, "Save design"):
 * 36 px high pill, 2 px outline, no shadow until hover / focus.
 */
export const chipClass =
  "border-ink text-ink lift press inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-full border-2 bg-white px-3 text-sm font-semibold no-underline! disabled:cursor-not-allowed disabled:border-ink/40 disabled:text-ink/40 disabled:shadow-none";

/** Round icon button (back arrow, gallery arrows, photo actions): a chip-styled circle. */
export const iconButtonClass =
  "border-ink text-ink lift press grid shrink-0 place-items-center rounded-full border-2 bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
