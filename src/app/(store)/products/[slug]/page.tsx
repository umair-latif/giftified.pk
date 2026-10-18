import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { editableProductIds, getProduct } from "@/config/products";
import {
  CATALOG_INFO,
  jsonLdScript,
  productGalleryItems,
  productOptions,
  productJsonLd,
  resolveSlug,
  sizes as sizesOf,
  slugFor,
  swatches,
} from "@/features/catalog/catalog-model";
import { DeliveryEstimate } from "@/features/catalog/components/delivery-estimate";
import { ProductDetails } from "@/features/catalog/components/product-details";
import { ProductArt } from "@/features/catalog/components/product-art";
import { ProductBuy } from "@/features/catalog/components/product-buy";
import { PhotoTips } from "@/features/catalog/components/photo-tips";
import { Disclosure } from "@/components/ui/disclosure";
import { COURIER_DAYS, maxFee, PRINT_DAYS } from "@/lib/delivery";
import { withLiveDesigns } from "@/features/templates/load-design-prices";
import { designsHref } from "@/features/templates/design-filters";
import { Swatches } from "@/features/catalog/components/swatches";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { loadDeliveryRates } from "@/features/catalog/load-rates";
import { formatPkr } from "@/features/checkout/format";
import { appBaseUrl } from "@/server/files/links";
import { Container } from "@/components/ui/page";
import { ProductDesignsShelf } from "@/features/templates/components/product-designs-shelf";
import { ReviewsSection } from "@/features/reviews/components/reviews-section";
import { loadReviews } from "@/features/reviews/load-reviews";
import {
  aggregateRatingJsonLd,
  summariseReviews,
} from "@/features/reviews/review-model";
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
      title: `${name} · DesignBanana`,
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
  const { templates: liveTemplates, prices } = await withLiveDesigns(templates);
  const designPrices = Object.values(prices).map((p) => p.pricePkr);
  const name = product?.name ?? cfg.name;
  const options = productOptions(product, productId, cfg.baseColors);
  const colours = swatches(product, cfg.baseColors);
  const productSizes = sizesOf(product);
  const info = CATALOG_INFO.find((c) => c.productId === productId);
  const rates = await loadDeliveryRates();
  const url = `${appBaseUrl()}/products/${product?.slug ?? productId}`;
  const top = rates ? maxFee(rates) : null;
  const reviews = product ? await loadReviews(product.wooProductId) : [];
  const reviewSummary = summariseReviews(reviews);

  return (
    <main>
      <Container width="wide" className="py-6">
        {product && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdScript(
                productJsonLd(
                  product,
                  url,
                  reviewSummary
                    ? aggregateRatingJsonLd(reviewSummary)
                    : undefined,
                ),
              ),
            }}
          />
        )}
        <Link
          href="/products"
          className="text-accent-text hover:text-deep w-fit text-sm font-semibold"
        >
          ← All products
        </Link>

        <ProductBuy
          productId={productId}
          name={name}
          spec={info?.spec ?? cfg.subtitle}
          options={options}
          gallery={productGalleryItems(product?.images ?? [], name)}
          fallbackArt={
            <ProductArt
              productId={productId}
              className="card aspect-square overflow-hidden"
            />
          }
          templateCount={liveTemplates.length}
          templateFromPkr={
            designPrices.length ? Math.min(...designPrices) : null
          }
          designsHref={designsHref({ product: productId })}
          delivery={
            <section
              aria-label="Delivery"
              className="card bg-soft! p-4"
              data-testid="delivery-estimate"
            >
              <DeliveryEstimate rates={rates} />
            </section>
          }
          below={
            <>
              <p className="text-ink text-sm" data-testid="reprint-promise">
                <strong className="font-semibold">
                  Free reprint if it arrives misprinted or damaged.
                </strong>{" "}
                Tell us within 48 hours.{" "}
                <Link
                  href="/help#reprint"
                  className="text-accent-text hover:text-deep underline"
                >
                  How it works
                </Link>
              </p>
              <PhotoTips cfg={cfg} />
            </>
          }
        />

        <div className="mt-6 space-y-3">
          <ProductDetails
            cfg={cfg}
            descriptionHtml={product?.descriptionHtml}
            extraFacts={
              <>
                <dt className="text-ink/65">Colours</dt>
                <dd>
                  <Swatches swatches={colours} size="md" />
                </dd>
                {productSizes.length > 0 && (
                  <>
                    <dt className="text-ink/65">Sizes</dt>
                    <dd>
                      {productSizes.join(" · ")}
                      {/* TODO(owner): size chart (chest/length in inches) for apparel. */}
                    </dd>
                  </>
                )}
              </>
            }
          />
          <Disclosure
            id="delivery-payment"
            className="card overflow-hidden"
            summaryClassName="lg:px-6 lg:py-4"
            bodyClassName="lg:px-6 lg:pb-6 space-y-2 text-sm text-ink"
            summary={
              <h2 className="type-card-title text-ink">
                Delivery &amp; payment
              </h2>
            }
            testId="delivery-payment"
          >
            <p>
              We deliver to every city and town in Pakistan
              {top !== null ? ` for ${formatPkr(top)} or less` : ""}. Your{" "}
              {name.toLowerCase()} is printed for you in {PRINT_DAYS.min}–
              {PRINT_DAYS.max} days after you confirm the order, then the
              courier takes {COURIER_DAYS.min}–{COURIER_DAYS.max} days.
            </p>
            <p>
              Pay cash when it arrives. Nothing to pay online. Before we print,
              we call or WhatsApp you to confirm your address, colour and size.
            </p>
            <p>
              <Link
                href="/help#delivery"
                className="text-accent-text underline"
              >
                More about delivery
              </Link>
            </p>
          </Disclosure>
          <Disclosure
            id="reprints"
            className="card overflow-hidden"
            summaryClassName="lg:px-6 lg:py-4"
            bodyClassName="lg:px-6 lg:pb-6 space-y-2 text-sm text-ink"
            summary={
              <h2 className="type-card-title text-ink">
                Reprints &amp; refunds
              </h2>
            }
            testId="reprints-refunds"
          >
            <p>
              If your order arrives with a printing fault, we reprint it free of
              charge. If it arrives damaged, we reprint it or refund you. Send
              us photos within 48 hours of delivery.
            </p>
            <p>
              Because everything is made to order, we can&apos;t take items back
              for a change of mind or a mistake in your own design. Check the
              preview carefully before you order.
            </p>
            <p>
              <Link href="/help#reprint" className="text-accent-text underline">
                Reprints and refunds in full
              </Link>
            </p>
          </Disclosure>
          <ReviewsSection reviews={reviews} />
        </div>
      </Container>
      {/* Full-width shelf, the same as the home page's "New designs". */}
      <ProductDesignsShelf productId={productId} templates={templates} />
    </main>
  );
}
