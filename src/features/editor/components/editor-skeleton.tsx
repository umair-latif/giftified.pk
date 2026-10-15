import Image from "next/image";
import type { ProductConfig } from "@/config/products";
import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";
import { formatCm } from "@/lib/units";
import { editorGuideFor } from "../mockup/garment-guide";
import { EditorToolbarSkeleton } from "./editor-toolbar";

/**
 * What the studio looks like before its JavaScript has loaded (server HTML,
 * also the Suspense fallback): header, steps, the product with its print area
 * and the tool bar, greyed out. Same layout as `DesignEditor`, so nothing
 * jumps when the real editor takes over.
 */
export function EditorSkeleton({ product }: { product: ProductConfig }) {
  const guide = editorGuideFor(product.id);
  const { widthMm, heightMm } = product.printArea;
  return (
    <div
      className="bg-page flex min-h-dvh flex-col pb-24 lg:pb-8"
      aria-busy="true"
      data-testid="editor-skeleton"
    >
      <AppHeader
        title="Design"
        backHref={`/products/${product.id}`}
        backLabel="Back to product"
        prefetch={false}
        next={{ label: "Preview", href: `/design/${product.id}/preview` }}
      />
      <StepBar current="Design" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 lg:grid lg:max-w-[76rem] lg:flex-none lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:px-6 lg:pt-2">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-ink/65 text-xs">
            <span className="text-ink/80 font-semibold">{product.name}</span> ·{" "}
            {product.subtitle} · print area {formatCm(widthMm)} ×{" "}
            {formatCm(heightMm)} cm
          </p>
          {guide ? (
            <Image
              src={guide.src}
              alt=""
              width={guide.widthPx}
              height={guide.heightPx}
              priority
              sizes="(min-width: 1024px) 700px, 100vw"
              className="h-auto w-full rounded-xl"
            />
          ) : (
            <div
              className="ring-ink/25 relative w-full overflow-hidden rounded-xl bg-white ring-1"
              style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
            >
              <div className="border-ink/25 absolute inset-[6%] rounded-lg border-2 border-dashed" />
            </div>
          )}
          <p className="text-ink/65 text-xs" role="status">
            Opening the studio…
          </p>
        </div>
        <aside
          aria-label="Editing tools"
          className="contents lg:sticky lg:top-32 lg:mt-7 lg:flex lg:flex-col lg:gap-3"
        >
          <EditorToolbarSkeleton />
        </aside>
      </main>
    </div>
  );
}
