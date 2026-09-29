import Image from "next/image";
import Link from "next/link";
import { OCCASIONS } from "@/features/home/occasions";
import type { TemplateMeta } from "@/server/templates/types";

const occasionLabel = (slug: string) =>
  OCCASIONS.find((o) => o.slug === slug)?.label ?? slug;

/**
 * Template cards: thumbnail, name, occasion chips. Tapping one opens the
 * editor with the template loaded (`?template=<id>`).
 * `productNames` adds the product to each card (occasion pages mix products).
 */
export function TemplateGrid({
  templates,
  productNames,
}: {
  templates: TemplateMeta[];
  productNames?: Record<string, string>;
}) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      data-testid="template-grid"
    >
      {templates.map((t) => (
        <li key={t.id}>
          <Link
            href={`/design/${t.productId}?template=${encodeURIComponent(t.id)}`}
            className="hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/40 block rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-cream relative aspect-[3/2] overflow-hidden rounded-xl">
              {t.hasThumbnail && (
                <Image
                  src={`/api/templates/${encodeURIComponent(t.id)}/thumbnail`}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 200px, 45vw"
                  className="object-contain"
                />
              )}
            </div>
            <p className="text-ink mt-2 truncate px-1 text-sm font-medium">
              {t.name}
            </p>
            <p className="truncate px-1 pb-1 text-xs text-zinc-500">
              {[productNames?.[t.productId], ...t.occasions.map(occasionLabel)]
                .filter(Boolean)
                .join(" · ") || "Personalise this design"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
