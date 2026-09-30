/**
 * The one pill button. Every primary / secondary action on the site uses
 * these classes, so height (48 px) and width are the same everywhere:
 * full width of its column on a phone, at least 160 px (and as wide as its
 * label) from `sm` up. It is a block (flex) element: use `mx-auto` to centre it. Only special controls (toolbars, chips, icon buttons,
 * the editor) use other sizes.
 *
 *  - primary: filled, the main action on the screen
 *  - secondary: white with an outline, the alternative action
 */
const BASE =
  "flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold no-underline! focus-visible:ring-2 focus-visible:outline-none sm:w-fit sm:min-w-40";

const VARIANTS = {
  primary:
    "bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 disabled:bg-brand-300 disabled:hover:bg-brand-300 aria-disabled:pointer-events-none aria-disabled:bg-zinc-300 text-white",
  secondary:
    "text-brand-700 ring-brand-600 focus-visible:ring-brand-600/40 bg-white ring-1 hover:bg-zinc-50 active:bg-zinc-50 disabled:text-zinc-300 disabled:ring-zinc-200",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/** Class string for a `<button>` or `<Link>`; `extra` is for spacing only (e.g. `mt-4`). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]}${extra ? ` ${extra}` : ""}`;
}
