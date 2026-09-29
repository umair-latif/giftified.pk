import type { ReactNode } from "react";

/**
 * The one accordion look (FAQ questions, product "Details"): native
 * <details>/<summary>, so it works without JavaScript, with the keyboard and
 * screen readers, and `#anchor` links open it in modern browsers.
 */
export function Disclosure({
  id,
  summary,
  children,
  className = "",
  summaryClassName = "font-medium",
  bodyClassName = "",
}: {
  id?: string;
  summary: ReactNode;
  children: ReactNode;
  /** Extra classes on the <details> (e.g. a standalone card frame). */
  className?: string;
  summaryClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <details id={id} className={`group ${className}`}>
      <summary
        className={`text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden ${summaryClassName}`}
      >
        <span className="flex-1">{summary}</span>
        <svg
          aria-hidden
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand-600 shrink-0 transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className={`px-4 pb-4 ${bodyClassName}`}>{children}</div>
    </details>
  );
}
