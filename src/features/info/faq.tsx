import type { ReactNode } from "react";
import { Disclosure } from "@/components/ui/disclosure";

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
    <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      {items.map((item) => (
        <Disclosure
          key={item.id}
          id={item.id}
          summary={item.question}
          bodyClassName="[&_a]:text-brand-700 space-y-3 text-sm text-ink [&_a]:underline [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
        >
          {item.answer}
        </Disclosure>
      ))}
    </div>
  );
}
