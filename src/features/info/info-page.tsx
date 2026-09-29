import type { ReactNode } from "react";
import { Page, PageTitle } from "@/components/ui/page";

/**
 * Shared building blocks for the static help/info pages (/help, /about, /contact,
 * /privacy, /terms). Server Components only: no client JS.
 */

export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Page width="content" className="text-ink leading-relaxed">
      <PageTitle>{title}</PageTitle>
      {intro && <p className="mt-2 text-zinc-700">{intro}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </Page>
  );
}

export function InfoSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <h2
        id={id ? `${id}-title` : undefined}
        className="font-display text-brand-800 text-lg"
      >
        {title}
      </h2>
      <div className="[&_a]:text-brand-700 [&_a]:hover:text-brand-800 [&_a]:focus-visible:ring-brand-600/20 mt-2 space-y-3 text-sm text-zinc-800 [&_a]:rounded [&_a]:underline [&_a]:focus-visible:ring-2 [&_a]:focus-visible:outline-none [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}

/**
 * A fact the founder still has to supply. The literal `TODO(founder)` stays in the
 * source so `grep -rn "TODO(founder)" src/` lists every open question, and it is
 * highlighted on the page so drafts are obvious in review.
 */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <mark
      data-testid="founder-todo"
      className="bg-sunny/60 text-ink rounded px-1 font-medium"
    >
      {children}
    </mark>
  );
}

/** Banner for the legal drafts (privacy, terms) until someone qualified reviews them. */
export function DraftNotice() {
  return (
    <p
      role="note"
      className="border-magenta/40 bg-magenta/5 rounded-lg border p-3 text-sm text-zinc-800"
    >
      <strong>Draft.</strong> This page is a plain-language draft and has not
      been reviewed by a lawyer yet.{" "}
      {/* TODO(founder): have a qualified person review this page, then remove this notice. */}
    </p>
  );
}
