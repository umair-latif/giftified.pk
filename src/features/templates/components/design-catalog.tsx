"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  DESIGN_SORTS,
  selectDesigns,
  type CatalogDesign,
  type DesignSort,
} from "../design-filters";
import type { DesignPrice } from "../load-design-prices";
import { DeleteTemplateButton } from "./delete-template-button";
import { DesignTile } from "./design-tile";

export interface CatalogCard extends CatalogDesign {
  href: string;
  subtitle: string;
  image: { src: string; kind: "mockup" | "art" } | null;
  price?: DesignPrice;
}

interface State {
  product: string;
  occasion: string;
  q: string;
  sort: DesignSort;
}

/** Keeps the address shareable (?product=mug&occasion=eid&q=&sort=) without a reload. */
function writeUrl(s: State) {
  const q = new URLSearchParams();
  if (s.product) q.set("product", s.product);
  if (s.occasion) q.set("occasion", s.occasion);
  if (s.q.trim()) q.set("q", s.q.trim());
  if (s.sort !== "newest") q.set("sort", s.sort);
  const qs = q.toString();
  window.history.replaceState(null, "", qs ? `/designs?${qs}` : "/designs");
}

/** Tiles on the first screen of a phone load straight away; the rest lazily. */
const EAGER = 4;

/**
 * The ready-made design catalog: search (name, product, occasion), sort,
 * product and occasion chips that combine, a result count and "Clear
 * filters". Rendered on the server with the filters from the address, then
 * filters instantly in the browser (23 designs today; fine client-side).
 */
export function DesignCatalog({
  designs,
  products,
  occasions,
  initial,
}: {
  designs: CatalogCard[];
  products: { id: string; label: string }[];
  occasions: { slug: string; label: string }[];
  initial: State;
}) {
  const [s, setS] = useState<State>(initial);
  const searchId = useId();
  const sortId = useId();
  const update = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    writeUrl(next);
  };
  const shown = selectDesigns(designs, {
    ...(s.product ? { product: s.product } : {}),
    ...(s.occasion ? { occasion: s.occasion } : {}),
    q: s.q,
    sort: s.sort,
  });
  const filtered = !!(s.product || s.occasion || s.q.trim());

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor={searchId}
            className="text-ink block text-sm font-semibold"
          >
            Search designs
          </label>
          <input
            id={searchId}
            type="search"
            value={s.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Name or occasion, e.g. Eid, Markhor"
            className="border-ink text-ink placeholder:text-ink/60 mt-1 block h-12 w-full rounded-xl border-2 bg-white px-3 text-base"
            data-testid="design-search"
          />
        </div>
        <div>
          <label
            htmlFor={sortId}
            className="text-ink block text-sm font-semibold"
          >
            Sort
          </label>
          <select
            id={sortId}
            value={s.sort}
            onChange={(e) => update({ sort: e.target.value as DesignSort })}
            className="border-ink text-ink mt-1 block h-12 w-full rounded-xl border-2 bg-white px-3 text-base sm:w-56"
            data-testid="design-sort"
          >
            {DESIGN_SORTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.length > 1 && (
        <ChipRow label="Product">
          <Chip pressed={!s.product} onClick={() => update({ product: "" })}>
            All
          </Chip>
          {products.map((p) => (
            <Chip
              key={p.id}
              pressed={s.product === p.id}
              onClick={() => update({ product: p.id })}
            >
              {p.label}
            </Chip>
          ))}
        </ChipRow>
      )}
      {occasions.length > 0 && (
        <ChipRow label="Occasion">
          <Chip pressed={!s.occasion} onClick={() => update({ occasion: "" })}>
            All
          </Chip>
          {occasions.map((o) => (
            <Chip
              key={o.slug}
              pressed={s.occasion === o.slug}
              onClick={() => update({ occasion: o.slug })}
            >
              {o.label}
            </Chip>
          ))}
        </ChipRow>
      )}

      <div className="mt-4 flex min-h-11 items-center gap-4">
        <p
          className="text-ink text-sm font-semibold"
          aria-live="polite"
          data-testid="design-count"
        >
          {shown.length} design{shown.length === 1 ? "" : "s"}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => update({ product: "", occasion: "", q: "" })}
            className="text-accent-text hover:text-deep min-h-11 text-sm font-semibold underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {shown.length > 0 ? (
        <ul
          className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          data-testid="template-grid"
        >
          {shown.map((d, i) => (
            <li key={d.id} className="flex flex-col">
              <div className="flex flex-1 flex-col [&>a]:flex-1">
                <DesignTile
                  href={d.href}
                  name={d.name}
                  subtitle={d.subtitle}
                  image={d.image}
                  imageAlt={`${d.name}, on a ${d.productName.replace(/^Custom /, "").toLowerCase()}`}
                  eager={i < EAGER}
                  {...(d.price ? { price: d.price } : {})}
                />
              </div>
              <DeleteTemplateButton id={d.id} name={d.name} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card mt-2 p-5 text-sm" data-testid="no-templates">
          <p className="text-ink">
            {filtered
              ? "No designs match. Try another word or clear the filters."
              : "Ready-made designs are on the way."}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonClass("primary")}>
              Design your own
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={`Filter by ${label.toLowerCase()}`}
      className="mt-4"
    >
      <p className="type-eyebrow text-ink/70">{label}</p>
      <ul className="-mx-4 mt-1.5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={`border-ink lift press inline-flex h-11 items-center rounded-full border-2 px-4 text-sm font-semibold ${
          pressed ? "bg-ink text-white" : "text-ink bg-white"
        }`}
      >
        {children}
      </button>
    </li>
  );
}
