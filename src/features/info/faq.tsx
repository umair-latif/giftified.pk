import type { ReactNode } from "react";

export interface FaqItem {
  /** Anchor id, so a question can be linked directly (e.g. /help#cod). */
  id: string;
  question: string;
  answer: ReactNode;
}

/**
 * FAQ accordion built on native <details>/<summary>: opens and closes without
 * JavaScript, works with the keyboard and screen readers, and #anchor links
 * open the matching question in modern browsers.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group">
          <summary className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{item.question}</span>
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
          <div className="[&_a]:text-brand-700 space-y-3 px-4 pb-4 text-sm text-zinc-800 [&_a]:underline [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
