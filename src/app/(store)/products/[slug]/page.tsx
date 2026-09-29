import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { editableProductIds, getProduct } from "@/config/products";
import {
  fromPrice,
  jsonLdScript,
  productJsonLd,
  resolveSlug,
  sizes as sizesOf,
  slugFor,
  swatches,
} from "@/features/catalog/catalog-model";
import { DeliveryEstimate } from "@/features/catalog/components/delivery-estimate";
import { ProductArt } from "@/features/catalog/components/product-art";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { Swatches } from "@/features/catalog/components/swatches";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { formatPkr } from "@/features/checkout/format";
import { appBaseUrl } from "@/server/files/links";
import { Page, PageTitle } from "@/components/ui/page";

export const revalidate = 3600;

const hasConfig = (id: string) => getProduct(id) !== null;

export async function generateStaticParams() {
  const catalog = await loadCatalog();
  return editableProductIds().map((id) => ({ slug: slugFor(id, catalog) }));
}

async function load(slug: string) {
  return resolveSlug(decodeURIComponent(slug), await loadCatalog(), hasConfig);
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = await load(slug);
  if (m.kind !== "found") return {};
  const cfg = getProduct(m.productId)!;
  const name = m.product?.name ?? cfg.name;
  const description =
    m.product?.shortDescription ??
    `${cfg.subtitle}. Add your photos and words, pay cash on delivery.`;
  const image = m.product?.images[0];
  return {
    metadataBase: new URL(appBaseUrl()),
    title: name,
    description,
    alternates: { canonical: `/products/${m.product?.slug ?? m.productId}` },
    openGraph: {
      title: `${name} · Giftified.pk`,
      description,
      type: "website",
      ...(image ? { images: [{ url: image.src, alt: image.alt }] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const m = await load(slug);
  if (m.kind === "redirect") redirect(m.to);
  if (m.kind === "none") notFound();

  const { productId, product } = m;
  const cfg = getProduct(productId)!;
  const name = product?.name ?? cfg.name;
  const hero = product?.images[0];
  const colours = swatches(product, cfg.baseColors);
  const productSizes = sizesOf(product);
  const url = `${appBaseUrl()}/products/${product?.slug ?? productId}`;

  return (
    <Page
      width="content"
      className="lg:grid lg:max-w-5xl lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_1fr_auto] lg:content-start lg:items-start lg:gap-x-10 lg:gap-y-4"
    >
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(productJsonLd(product, url)),
          }}
        />
      )}
      <Link
        href="/products"
        className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 w-fit rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none lg:col-span-2"
      >
        ← All products
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:col-start-2 lg:row-start-2 lg:mt-0">
        <PageTitle>{name}</PageTitle>
        {product && (
          <p className="text-zinc-900">
            from{" "}
            <span className="font-semibold">
              {formatPkr(fromPrice(product))}
            </span>
          </p>
        )}
        <span className="bg-mint-300 text-ink rounded-full px-2.5 py-0.5 text-xs font-semibold">
          Cash on Delivery
        </span>
      </header>

      {/* First card, always: Design your own. */}
      <section
        aria-labelledby="design-own"
        className="border-brand-200 mt-4 overflow-hidden rounded-3xl border-2 bg-white shadow-sm lg:contents"
        data-testid="design-your-own"
      >
        <div className="lg:border-brand-200 lg:col-start-1 lg:row-span-3 lg:row-start-2 lg:overflow-hidden lg:rounded-3xl lg:border-2 lg:shadow-sm">
          {hero ? (
            <Image
              src={hero.src}
              alt={hero.alt}
              width={960}
              height={720}
              sizes="(max-width: 768px) 100vw, 720px"
              className="aspect-[4/3] w-full object-cover lg:aspect-square"
              preload
            />
          ) : (
            <ProductArt
              productId={productId}
              className="aspect-[4/3] lg:aspect-square"
            />
          )}
        </div>
        <div className="lg:border-brand-200 space-y-3 p-4 lg:col-start-2 lg:row-start-3 lg:rounded-3xl lg:border-2 lg:bg-white lg:shadow-sm">
          <h2 id="design-own" className="font-display text-ink text-xl">
            Design your own
          </h2>
          <p className="text-zinc-700">
            Your photos, your words. Start from a blank {name.toLowerCase()} and
            make it yours.
          </p>
          <Link
            href={`/design/${productId}`}
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 flex h-12 items-center justify-center rounded-full text-base font-semibold text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            Start designing
          </Link>
        </div>
      </section>

      <details className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 lg:col-start-2 lg:row-start-4 lg:mt-0">
        <summary className="text-ink cursor-pointer text-base font-semibold">
          Details
        </summary>
        <div className="mt-3 space-y-4">
          {product && <ProductGallery images={product.images} />}
          {product?.descriptionHtml ? (
            <div
              className="space-y-2 text-sm text-zinc-700 [&_li]:ml-5 [&_li]:list-disc"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          ) : (
            <p className="text-sm text-zinc-700">{cfg.subtitle}.</p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">Print area</dt>
            <dd>
              {cfg.printArea.widthMm} × {cfg.printArea.heightMm} mm · printed at{" "}
              {cfg.printDpi} DPI
            </dd>
            <dt className="text-zinc-500">Colours</dt>
            <dd>
              <Swatches swatches={colours} size="md" />
            </dd>
            {productSizes.length > 0 && (
              <>
                <dt className="text-zinc-500">Sizes</dt>
                <dd>
                  {productSizes.join(" · ")}
                  {/* TODO(founder): size chart (chest/length in inches) for apparel. */}
                </dd>
              </>
            )}
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
        </div>
      </details>

      <section
        id="designs"
        aria-labelledby="designs-heading"
        className="mt-6 lg:col-span-2 lg:mt-4"
      >
        <h2 id="designs-heading" className="font-display text-ink text-lg">
          Ready-made designs — coming soon
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Templates for Eid, birthdays, weddings and more are on the way.
        </p>
      </section>
    </Page>
  );
}
