import type { ElementType, ReactNode } from "react";

/**
 * The three page widths. Every shop page uses exactly one of them, so the
 * left edge of the content is the same from page to page.
 *  - narrow  (448 px): one short task — sign-in, account, reset password
 *  - content (672 px): reading and forms — cart, checkout, track, order, info, legal, product
 *  - wide    (1024 px): browsing — home, product list; header and footer use it too
 */
const WIDTHS = {
  narrow: "max-w-md",
  content: "max-w-2xl",
  wide: "max-w-5xl",
} as const;

export type PageWidth = keyof typeof WIDTHS;

/** Classes for a centred column of the given width (16 px side gutters). */
export const pageWidthClass = (width: PageWidth) =>
  `mx-auto w-full px-4 ${WIDTHS[width]}`;

/** A page body: the `<main>` landmark with a width and the standard vertical padding. */
export function Page({
  width,
  className = "",
  children,
}: {
  width: PageWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className={`${pageWidthClass(width)} py-6 ${className}`}>
      {children}
    </main>
  );
}

/** A column of the given width inside a full-bleed section (home sections, footer). */
export function Container({
  width,
  as: Tag = "div",
  className = "",
  children,
}: {
  width: PageWidth;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`${pageWidthClass(width)} ${className}`}>{children}</Tag>
  );
}

/** The one page heading (h1): same size, colour and font on every page. */
export function PageTitle({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h1 className={`font-display text-brand-900 text-2xl ${className}`}>
      {children}
    </h1>
  );
}
