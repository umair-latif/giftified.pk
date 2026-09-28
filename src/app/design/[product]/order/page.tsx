import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";
import { editableProductIds, getProduct } from "@/config/products";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";

export const dynamicParams = false;

export function generateStaticParams() {
  return editableProductIds().map((product) => ({ product }));
}

export async function generateMetadata(
  props: PageProps<"/design/[product]/order">,
): Promise<Metadata> {
  const { product: id } = await props.params;
  const product = getProduct(id);
  return { title: product ? `Order your ${product.name}` : "Order" };
}

export default async function OrderPage(
  props: PageProps<"/design/[product]/order">,
) {
  const { product: id } = await props.params;
  const product = getProduct(id);
  if (!product) notFound();
  return (
    <div className="min-h-dvh bg-zinc-50">
      <AppHeader
        title="Order"
        backHref={`/design/${product.id}/preview`}
        backLabel="Back to preview"
      />
      <StepBar current="Order" />
      <main className="mx-auto max-w-md px-4 pb-8">
        <CheckoutForm product={product} />
      </main>
    </div>
  );
}
