import { FabricImage, type Canvas, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { imageDpi } from "@/lib/print-quality";
import { IMAGE_CUSTOM_PROPS } from "../assets/asset-ref";
import { applyTouchControls } from "./controls";
import { initialImageWidthMm } from "./image-fit";

// Serialise our asset metadata with every image (history, drafts, orders).
FabricImage.customProperties = [...IMAGE_CUSTOM_PROPS];

export interface ImageAssetMeta {
  assetId: string;
  /** Pixel size of the ORIGINAL upload — the basis for print DPI. */
  sourceWidthPx: number;
  sourceHeightPx: number;
}

type AssetImage = FabricImage & Partial<ImageAssetMeta>;

export async function addImage(
  canvas: Canvas,
  area: PrintArea,
  previewUrl: string,
  meta: ImageAssetMeta,
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(previewUrl);
  const widthMm = initialImageWidthMm(
    { widthPx: meta.sourceWidthPx, heightPx: meta.sourceHeightPx },
    area,
  );
  const scale = widthMm / img.width;
  img.set({
    left: area.widthMm / 2,
    top: area.heightMm / 2,
    originX: "center",
    originY: "center",
    scaleX: scale,
    scaleY: scale,
  });
  Object.assign(img, meta);
  applyTouchControls(img);
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return img;
}

/** Effective print DPI of an image object at its current size, or null for non-images. */
export function objectDpi(obj: FabricObject | undefined): number | null {
  if (!obj || obj.type.toLowerCase() !== "image") return null;
  const img = obj as AssetImage;
  if (!img.sourceWidthPx || !img.sourceHeightPx) return null;
  return imageDpi({
    sourceWidthPx: img.sourceWidthPx,
    sourceHeightPx: img.sourceHeightPx,
    widthMm: img.getScaledWidth(),
    heightMm: img.getScaledHeight(),
  });
}
