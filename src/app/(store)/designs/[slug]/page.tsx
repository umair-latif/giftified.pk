import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclosure } from "@/components/ui/disclosure";
import { Page, PageTitle } from "@/components/ui/page";
import { getProduct } from "@/config/products";
import { sizes as sizesOf } from "@/features/catalog/catalog-model";
import { DeliveryEstimate } from "@/features/catalog/components/delivery-estimate";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { formatPkr } from "@/features/checkout/format";
import { DesignBuyBox } from "@/features/templates/components/design-buy-box";
import { loadTemplates } from "@/features/templates/load-templates";
import { getCommerce } from "@/lib/commerce";
import { printQualityReport } from "@/lib/print-quality";
import { appBaseUrl } from "@/server/files/links";
import { getTemplate } from "@/server/templates";

export const revalidate = 300;

/** The published design product for a URL slug, from our templates + WooCommerce (price, title, description). */
async function load(slug: string) {
  const meta = (await loadTemplates()).find((t) => t.product?.slug === slug);
  if (!meta) return null;
  const info = await getCommerce()
    .getDesignProduct(meta.id)
    .catch(() => null);
  if (!info) return null;
  const detail = await getTemplate(meta.id).catch(() => null);
  const needsPhoto =
    !!detail && printQualityReport(detail.design.fabric).placeholders > 0;
  return { meta, info, needsPhoto };
}

export async function generateMetadata({
  params,
}: PageProps<"/designs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(decodeURIComponent(slug));
  if (!d) return {};
  const description = d.info.descriptionHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    metadataBase: new URL(appBaseUrl()),
    title: d.info.name,
    description:
      description || `${d.info.name}. Cash on Delivery across Pakistan.`,
    alternates: { canonical: `/designs/${d.info.slug}` },
  };
}

export default async function DesignProductPage({
  params,
}: PageProps<"/designs/[slug]">) {
  const { slug } = await params;
  const d = await load(decodeURIComponent(slug));
  if (!d) notFound();
  const { meta, info, needsPhoto } = d;
  const cfg = getProduct(info.baseProductId);
  if (!cfg) notFound();
  const catalog = await loadCatalog();
  const base = catalog.find((p) => p.productId === info.baseProductId);
  const image = meta.hasThumbnail
    ? `/api/templates/${encodeURIComponent(meta.id)}/thumbnail`
    : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: info.name,
    ...(image ? { image: `${appBaseUrl()}${image}` } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: info.pricePkr,
      availability: "https://schema.org/InStock",
      url: `${appBaseUrl()}/designs/${info.slug}`,
    },
  };

  return (
    <Page width="content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href={`/products/${base?.slug ?? cfg.id}#designs`}
        className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 w-fit rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        ← {cfg.name} designs
      </Link>

      <div className="mt-2 grid gap-5 lg:grid-cols-2 lg:gap-10">
        <div className="bg-cream relative aspect-[3/2] overflow-hidden rounded-3xl ring-1 ring-zinc-200 lg:aspect-square">
          {image && (
            <Image
              src={image}
              alt={info.name}
              fill
              unoptimized
              preload
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-contain"
            />
          )}
        </div>
        <div className="space-y-4">
          <header className="space-y-1">
            <PageTitle>{info.name}</PageTitle>
            <p className="text-brand-900">
              <span
                className="text-xl font-semibold"
                data-testid="design-price"
              >
                {formatPkr(info.pricePkr)}
              </span>{" "}
              <span className="bg-mint-300 text-ink ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                Cash on Delivery
              </span>
            </p>
          </header>
          {info.descriptionHtml && (
            <div
              className="text-ink space-y-2 text-sm [&_li]:ml-5 [&_li]:list-disc"
              dangerouslySetInnerHTML={{ __html: info.descriptionHtml }}
            />
          )}
          <DesignBuyBox
            templateId={meta.id}
            productId={info.baseProductId}
            colours={cfg.baseColors}
            sizes={sizesOf(base)}
            needsPhoto={needsPhoto}
          />
        </div>
      </div>

      <Disclosure
        summary="Details"
        className="mt-6 rounded-2xl bg-white ring-1 ring-zinc-200"
        summaryClassName="rounded-2xl text-base font-semibold"
        bodyClassName="space-y-4 pt-1"
      >
        <p className="text-ink text-sm">{cfg.subtitle}.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Print area</dt>
          <dd>
            {cfg.printArea.widthMm} × {cfg.printArea.heightMm} mm · printed at{" "}
            {cfg.printDpi} DPI
          </dd>
          <dt className="text-zinc-500">Reprints</dt>
          <dd>
            Arrives damaged or misprinted? We&apos;ll put it right —{" "}
            <Link
              href="/help"
              className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 rounded underline focus-visible:ring-2 focus-visible:outline-none"
            >
              see Help
            </Link>
            .
          </dd>
        </dl>
        <DeliveryEstimate />
      </Disclosure>
    </Page>
  );
}
