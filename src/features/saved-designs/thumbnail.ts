import { resolveAssetRefs } from "@/features/editor/assets/resolve";
import type { DesignDocument } from "@/types/design";

/**
 * Small WebP (≈320 px wide, on white) of a design for the My designs list.
 * Null when it can't be drawn — the list then shows a plain tile.
 */
export async function designThumbnail(
  design: DesignDocument,
  widthPx = 320,
): Promise<Blob | null> {
  try {
    const { renderDesignToDataUrl } = await import("@/features/editor/engine");
    const { fabric } = await resolveAssetRefs(design.fabric);
    const src = await renderDesignToDataUrl({ ...design, fabric }, widthPx);
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), "image/webp", 0.75),
    );
  } catch {
    return null;
  }
}
