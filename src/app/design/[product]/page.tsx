import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editableProductIds, getProduct } from "@/config/products";
import { Suspense } from "react";
import { preload } from "react-dom";
import { DEFAULT_TEXT_FONT } from "@/config/fonts";
import { EditorEntry } from "@/features/editor/components/editor-entry";
import { EditorSkeleton } from "@/features/editor/components/editor-skeleton";

/** New text is Sans bold (engine/text.ts). */
const boldFace =
  DEFAULT_TEXT_FONT.faces.find((f) => f.weight === "bold")?.file ??
  DEFAULT_TEXT_FONT.faces[0]!.file;

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

export default async function DesignPage(
  props: PageProps<"/design/[product]">,
) {
  const { product: id } = await props.params;
  const product = getProduct(id);
  if (!product) notFound();
  // The default text font is needed as soon as the studio opens.
  preload(`/fonts/print/${DEFAULT_TEXT_FONT.dir}/${boldFace}.woff2`, {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  // Suspense: the editor reads ?item= on the client (the page stays static).
  // Until its JavaScript runs, the server HTML shows the studio skeleton.
  return (
    <Suspense fallback={<EditorSkeleton product={product} />}>
      <EditorEntry product={product} />
    </Suspense>
  );
}
