import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, PageTitle } from "@/components/ui/page";
import { getProduct } from "@/config/products";
import { OCCASIONS } from "@/features/home/occasions";
import { TemplateGrid } from "@/features/templates/components/template-grid";
import { loadTemplates } from "@/features/templates/load-templates";
import { OCCASION_SLUGS, type OccasionSlug } from "@/server/templates/types";
import { buttonClass } from "@/components/ui/button";

export const revalidate = 300;

export function generateStaticParams() {
  return OCCASION_SLUGS.map((slug) => ({ slug }));
}

const labelOf = (slug: string) =>
  OCCASIONS.find((o) => o.slug === slug)?.label ?? slug;

export async function generateMetadata({
  params,
}: PageProps<"/occasions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${labelOf(slug)} gifts`,
    description: `Ready-made ${labelOf(slug)} designs you can personalise with your photos and words. Cash on Delivery across Pakistan.`,
  };
}

export default async function OccasionPage({
  params,
}: PageProps<"/occasions/[slug]">) {
  const { slug } = await params;
  if (!(OCCASION_SLUGS as readonly string[]).includes(slug)) notFound();
  const templates = await loadTemplates({ occasion: slug as OccasionSlug });
  const productNames = Object.fromEntries(
    templates.map((t) => [t.productId, getProduct(t.productId)?.name ?? ""]),
  );
  return (
    <Page width="wide">
      <PageTitle>{labelOf(slug)}</PageTitle>
      <p className="mt-1 text-sm text-zinc-600">
        Pick a design, swap in your photos and words, and order. Cash on
        Delivery.
      </p>
      <div className="mt-5">
        {templates.length > 0 ? (
          <TemplateGrid templates={templates} productNames={productNames} />
        ) : (
          <div className="card p-5 text-sm" data-testid="no-templates">
            <p className="text-ink">{labelOf(slug)} designs are on the way.</p>
            <Link href="/products" className={buttonClass("primary", "mt-4")}>
              Design your own
            </Link>
          </div>
        )}
      </div>
    </Page>
  );
}
