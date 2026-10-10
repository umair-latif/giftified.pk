import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Page, PageTitle } from "@/components/ui/page";
import { editableProductIds, getProduct } from "@/config/products";
import { OCCASIONS } from "@/features/home/occasions";
import { TemplateGrid } from "@/features/templates/components/template-grid";
import {
  designsHref,
  parseDesignFilters,
} from "@/features/templates/design-filters";
import { loadTemplates } from "@/features/templates/load-templates";
import type { OccasionSlug } from "@/server/templates/types";

export const metadata: Metadata = {
  title: "Ready-made designs",
  description:
    "Ready-made designs for mugs, T-shirts and hoodies. Swap in your own photos, names and words. Cash on Delivery across Pakistan.",
  alternates: { canonical: "/designs" },
};

const productName = (id: string) => getProduct(id)?.name ?? id;

/**
 * All published designs (the marketplace), newest first, with filters by
 * product and occasion as plain links (`?product=mug&occasion=eid`), so they
 * work without JavaScript and can be shared. Linked from the home page's "New
 * designs" and the product pages' "Ready-made designs" shelves.
 */
export default async function DesignsPage({
  searchParams,
}: PageProps<"/designs">) {
  const filters = parseDesignFilters(await searchParams);
  const all = await loadTemplates();
  // Only offer filters that have designs behind them.
  const products = editableProductIds().filter((id) =>
    all.some((t) => t.productId === id),
  );
  const occasions = OCCASIONS.filter((o) =>
    all.some(
      (t) =>
        (!filters.product || t.productId === filters.product) &&
        (t.occasions as readonly string[]).includes(o.slug),
    ),
  );
  const shown = all.filter(
    (t) =>
      (!filters.product || t.productId === filters.product) &&
      (!filters.occasion ||
        (t.occasions as readonly string[]).includes(filters.occasion)),
  );
  const productNames = Object.fromEntries(
    shown.map((t) => [t.productId, productName(t.productId)]),
  );
  const filtered = !!(filters.product || filters.occasion);

  return (
    <Page width="wide">
      <PageTitle>Ready-made designs</PageTitle>
      <p className="mt-1 text-sm text-zinc-600">
        Made by our designers. Pick one, swap in your own photos, names and
        words, and order. Cash on Delivery.
      </p>

      {products.length > 1 && (
        <FilterRow label="Product">
          {/* Changing the product clears the occasion: its list depends on it. */}
          <Chip href={designsHref()} active={!filters.product}>
            All
          </Chip>
          {products.map((id) => (
            <Chip
              key={id}
              href={designsHref({ product: id })}
              active={filters.product === id}
            >
              {productName(id)}
            </Chip>
          ))}
        </FilterRow>
      )}
      {occasions.length > 0 && (
        <FilterRow label="Occasion">
          <Chip
            href={designsHref(
              filters.product ? { product: filters.product } : {},
            )}
            active={!filters.occasion}
          >
            Any
          </Chip>
          {occasions.map((o) => (
            <Chip
              key={o.slug}
              href={designsHref({
                ...filters,
                occasion: o.slug as OccasionSlug,
              })}
              active={filters.occasion === o.slug}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
      )}

      <div className="mt-5">
        {shown.length > 0 ? (
          <TemplateGrid templates={shown} productNames={productNames} />
        ) : (
          <div className="card p-5 text-sm" data-testid="no-templates">
            <p className="text-ink">
              {filtered
                ? "No designs match these filters yet."
                : "Ready-made designs are on the way."}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {filtered && (
                <Link href="/designs" className={buttonClass("secondary")}>
                  See all designs
                </Link>
              )}
              <Link href="/products" className={buttonClass("primary")}>
                Design your own
              </Link>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={`Filter by ${label.toLowerCase()}`} className="mt-4">
      <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">
        {label}
      </p>
      <ul className="-mx-4 mt-1.5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
    </nav>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        scroll={false}
        className={`border-ink focus-visible:ring-brand-600/40 inline-flex h-9 items-center rounded-full border-2 px-3.5 text-sm font-semibold no-underline! focus-visible:ring-2 focus-visible:outline-none ${
          active ? "bg-ink text-white" : "text-ink hover:bg-mint-100 bg-white"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
