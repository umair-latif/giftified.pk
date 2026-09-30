import type { Metadata } from "next";
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
import { ProductDetails } from "@/features/catalog/components/product-details";
import { ProductArt } from "@/features/catalog/components/product-art";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { Swatches } from "@/features/catalog/components/swatches";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { formatPkr } from "@/features/checkout/format";
import { appBaseUrl } from "@/server/files/links";
import { Page, PageTitle } from "@/components/ui/page";
import { TemplateGrid } from "@/features/templates/components/template-grid";
import { loadTemplates } from "@/features/templates/load-templates";

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
  const templates = await loadTemplates({ productId });
  const name = product?.name ?? cfg.name;
  const colours = swatches(product, cfg.baseColors);
  const productSizes = sizesOf(product);
  const url = `${appBaseUrl()}/products/${product?.slug ?? productId}`;

  return (
    <Page width="wide">
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
        className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 w-fit rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        ← All products
      </Link>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:gap-10">
        {product && product.images.length > 0 ? (
          <ProductGallery images={product.images} name={name} />
        ) : (
          <ProductArt
            productId={productId}
            className="aspect-square overflow-hidden rounded-3xl ring-1 ring-zinc-200"
          />
        )}
        <div className="min-w-0 space-y-4">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <PageTitle>{name}</PageTitle>
            {product && (
              <p className="text-brand-900">
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
            className="border-brand-200 space-y-3 rounded-3xl border-2 bg-white p-4 shadow-sm"
            data-testid="design-your-own"
          >
            <h2 id="design-own" className="font-display text-ink text-xl">
              Design your own
            </h2>
            <p className="text-ink">
              Your photos, your words. Start from a blank {name.toLowerCase()}{" "}
              and make it yours.
            </p>
            <Link
              href={`/design/${productId}`}
              className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 flex h-12 items-center justify-center rounded-full text-base font-semibold text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              Start designing
            </Link>
          </section>
        </div>
      </div>

      <ProductDetails
        cfg={cfg}
        descriptionHtml={product?.descriptionHtml}
        className="mt-6"
        extraFacts={
          <>
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
          </>
        }
      />

      <section id="designs" aria-labelledby="designs-heading" className="mt-8">
        <h2 id="designs-heading" className="font-display text-ink text-lg">
          {templates.length > 0
            ? "Ready-made designs"
            : "Ready-made designs — coming soon"}
        </h2>
        {templates.length > 0 ? (
          <>
            <p className="mt-1 mb-3 text-sm text-zinc-600">
              Pick one, then swap in your own photos and words.
            </p>
            <TemplateGrid templates={templates} />
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Templates for Eid, birthdays, weddings and more are on the way.
          </p>
        )}
      </section>
    </Page>
  );
}
