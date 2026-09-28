import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { editableProductIds, getProduct } from "@/config/products";
import { PreviewScreen } from "@/features/editor/components/preview-screen";

export const dynamicParams = false;

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
  // Suspense: the screen reads ?item= on the client (the page stays static).
  return (
    <Suspense>
      <PreviewScreen product={product} />
    </Suspense>
  );
}
