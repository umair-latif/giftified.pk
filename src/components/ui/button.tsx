/**
 * The one button. Every primary / secondary action on the site uses these
 * classes, so height (48 px), shape and width are the same everywhere: full
 * width of its column on a phone, at least 160 px (and as wide as its label)
 * from `sm` up. Brand style (docs/brand.md): 16px corners, 3px black outline
 * and a 4px hard shadow that presses in when tapped. It is a block (flex)
 * element: use `mx-auto` to centre it. Only special controls (toolbars, chips,
 * icon buttons, the editor) use other sizes.
 *
 *  - primary: deep teal, the main action on the screen
 *  - secondary: white, the alternative action
 *  - sunny: banana yellow, for coloured backgrounds (hero, footer)
 */
const BASE =
  "border-ink flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[3px] px-6 text-base font-semibold no-underline! shadow-[4px_4px_0_var(--color-ink)] transition duration-150 focus-visible:ring-2 focus-visible:outline-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-ink)] disabled:translate-0 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:shadow-none sm:w-fit sm:min-w-40";

const VARIANTS = {
  primary:
    "bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 text-white disabled:bg-brand-300 disabled:hover:bg-brand-300 aria-disabled:bg-brand-300",
  secondary:
    "text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/40 bg-white disabled:border-zinc-300 disabled:text-zinc-400",
  sunny:
    "bg-sunny text-ink focus-visible:ring-ink/40 hover:bg-[#ffd814] active:bg-[#ffd814] disabled:border-zinc-400 disabled:bg-zinc-200 disabled:text-zinc-500",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/** Class string for a `<button>` or `<Link>`; `extra` is for spacing only (e.g. `mt-4`). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]}${extra ? ` ${extra}` : ""}`;
}

/**
 * Small secondary action (editor chips, "Save design"): 36 px high, as wide as
 * its label, 2 px outline and a 2 px hard shadow, so it reads as a button
 * without competing with the main one.
 */
export const chipClass =
  "border-ink text-ink focus-visible:ring-brand-600/40 inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-xl border-2 bg-white px-3 text-xs font-semibold no-underline! shadow-[2px_2px_0_var(--color-ink)] transition duration-150 hover:bg-mint-100 focus-visible:ring-2 focus-visible:outline-none active:translate-x-px active:translate-y-px active:shadow-none disabled:border-zinc-300 disabled:text-zinc-400 disabled:shadow-none disabled:hover:bg-white";
