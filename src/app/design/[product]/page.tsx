import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editableProductIds, getProduct } from "@/config/products";
import { DesignEditor } from "@/features/editor/components/design-editor";

export const dynamicParams = false;

export function generateStaticParams() {
  return editableProductIds().map((product) => ({ product }));
}

export async function generateMetadata(
  props: PageProps<"/design/[product]">,
): Promise<Metadata> {
  const { product: id } = await props.params;
  const product = getProduct(id);
  return { title: product ? `Design your ${product.name}` : "Design" };
}

export default async function DesignPage(props: PageProps<"/design/[product]">) {
  const { product: id } = await props.params;
  const product = getProduct(id);
  if (!product) notFound();
  return <DesignEditor product={product} />;
}
