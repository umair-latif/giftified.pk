import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { BUTTON_SKIN, iconButtonClass } from "./button";

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
  /**
   * Prefetch the back/next pages (Next's default). The studio turns it off:
   * on a slow phone network those requests delay the drawing engine.
   */
  prefetch?: boolean;
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
  prefetch = true,
}: Props) {
  return (
    <header
      style={{ viewTransitionName: "app-header" }}
      className="border-ink/15 sticky top-0 z-20 border-b bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-1 lg:h-16 lg:max-w-[76rem] lg:gap-2 lg:px-5">
        {backHref ? (
          <Link
            href={backHref}
            prefetch={prefetch ? null : false}
            aria-label={backLabel}
            className={`${iconButtonClass} mr-1.5 ml-1 size-10 lg:size-11`}
          >
            <ArrowLeftIcon />
          </Link>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <h1 className="text-ink min-w-0 flex-1 truncate text-base font-semibold lg:text-xl">
          {title}
        </h1>
        {actions}
        {next &&
          (next.href ? (
            <Link
              href={next.href}
              prefetch={prefetch ? null : false}
              className={`${BUTTON_SKIN.primary} border-ink text-ink press mr-1 ml-1 flex h-10 shrink-0 items-center gap-0.5 rounded-2xl border-[3px] pr-2 pl-3.5 text-base font-semibold lg:h-11 lg:gap-1 lg:pr-3 lg:pl-5`}
            >
              {next.label}
              <ArrowRightIcon width={18} height={18} />
            </Link>
          ) : (
            <span
              aria-disabled
              className="bg-page border-ink/40 text-ink/50 mr-1 ml-1 flex h-10 shrink-0 cursor-not-allowed items-center gap-0.5 rounded-2xl border-[3px] pr-2 pl-3.5 text-base font-semibold lg:h-11"
            >
              {next.label}
              <ArrowRightIcon width={18} height={18} />
            </span>
          ))}
      </div>
    </header>
  );
}
