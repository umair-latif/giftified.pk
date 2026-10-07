import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

interface NextAction {
  label: string;
  /** Omit to show a disabled "coming soon" button. */
  href?: string;
}

interface Props {
  title: ReactNode;
  /** Where the back arrow goes. Omit on top-level screens. */
  backHref?: string;
  backLabel?: string;
  next?: NextAction;
  /** Extra actions shown before the Next button (e.g. undo/redo). */
  actions?: ReactNode;
}

/**
 * Sticky top bar used on every screen: back arrow (to the parent screen),
 * title, optional actions and a primary "Next" arrow for the flow.
 * Back uses a fixed parent route instead of browser history, so it behaves
 * the same when the page was opened from a shared link or installed PWA.
 */
export function AppHeader({
  title,
  backHref,
  backLabel = "Back",
  next,
  actions,
}: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-1 lg:h-16 lg:max-w-[76rem] lg:gap-2 lg:px-5">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="focus-visible:ring-brand-600/20 grid size-11 shrink-0 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-100 lg:size-12"
          >
            <ArrowLeftIcon />
          </Link>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-zinc-900 lg:text-xl">
          {title}
        </h1>
        {actions}
        {next &&
          (next.href ? (
            <Link
              href={next.href}
              className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 border-ink ml-1 flex h-9 shrink-0 items-center gap-0.5 rounded-xl border-2 pr-2 pl-3.5 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none lg:h-11 lg:gap-1 lg:pr-3 lg:pl-5 lg:text-base"
            >
              {next.label}
              <ArrowRightIcon width={18} height={18} />
            </Link>
          ) : (
            <span
              aria-disabled
              className="bg-brand-300 border-ink ml-1 flex h-9 shrink-0 items-center gap-0.5 rounded-xl border-2 pr-2 pl-3.5 text-sm font-medium text-white"
            >
              {next.label}
              <ArrowRightIcon width={18} height={18} />
            </span>
          ))}
      </div>
    </header>
  );
}
