import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { editableProductIds, getProduct } from "@/config/products";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { PreviewScreen } from "@/features/editor/components/preview-screen";

export const dynamicParams = false;
// Sizes come from the store, which may be unreachable at build time: render on
// request (the catalog itself is cached by the commerce adapter).
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return editableProductIds().map((product) => ({ product }));
}

export async function generateMetadata(
  props: PageProps<"/design/[product]/preview">,
): Promise<Metadata> {
  const { product: id } = await props.params;
  const product = getProduct(id);
  return { title: product ? `Preview your ${product.name}` : "Preview" };
}

export default async function PreviewPage(
  props: PageProps<"/design/[product]/preview">,
) {
  const { product: id } = await props.params;
  const product = getProduct(id);
  if (!product) notFound();
  // Sizes come from the store (WooCommerce variations); mugs have none.
  const variants = (await loadCatalog())
    .find((p) => p.productId === product.id)
    ?.variants.map((v) => ({
      colourId: v.colourId,
      inStock: v.inStock,
      ...(v.size ? { size: v.size } : {}),
    }));
  // Suspense: the screen reads ?item= on the client (the page stays static).
  return (
    <Suspense>
      <PreviewScreen product={product} variants={variants ?? []} />
    </Suspense>
  );
}
