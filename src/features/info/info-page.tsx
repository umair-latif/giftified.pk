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
      {intro && <p className="text-ink/80 mt-2">{intro}</p>}
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
        className="type-card-title text-deep"
      >
        {title}
      </h2>
      <div className="[&_a]:text-accent-text [&_a]:hover:text-deep text-ink mt-2 space-y-3 text-sm [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">
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
      className="bg-soft text-ink outline-highlight px-1 font-semibold outline-2 outline-dashed"
    >
      {children}
    </mark>
  );
}
