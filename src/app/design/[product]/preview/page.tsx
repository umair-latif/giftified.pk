import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";
import { editableProductIds, getProduct } from "@/config/products";
import { DesignPreview } from "@/features/editor/components/design-preview";

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
  return (
    <div className="min-h-dvh bg-zinc-50">
      <AppHeader
        title="Preview"
        backHref={`/design/${product.id}`}
        backLabel="Back to editor"
        next={{ label: "Order" }}
      />
      <StepBar current="Preview" />
      <main className="mx-auto max-w-md px-4 pb-8">
        <DesignPreview product={product} />
      </main>
    </div>
  );
}
