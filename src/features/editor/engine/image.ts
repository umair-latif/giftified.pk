import { FabricImage, Point, type Canvas, type FabricObject } from "fabric";
import type { PrintArea } from "@/config/products";
import { imageDpi } from "@/lib/print-quality";
import { IMAGE_CUSTOM_PROPS } from "../assets/asset-ref";
import { applyTouchControls } from "./controls";
import { FULL_RECT, type NormRect } from "./crop";
import { initialImageWidthMm } from "./image-fit";

// Serialise our asset metadata with every image (history, drafts, orders).
FabricImage.customProperties = [...IMAGE_CUSTOM_PROPS];

export interface ImageAssetMeta {
  assetId: string;
  /** Pixel size of the ORIGINAL upload — the basis for print DPI. */
  sourceWidthPx: number;
  sourceHeightPx: number;
}

interface PreviewMeta {
  /** Pixel size of the full (uncropped) preview element the canvas draws. */
  previewWidthPx: number;
  previewHeightPx: number;
}

export type AssetImage = FabricImage & Partial<ImageAssetMeta & PreviewMeta>;

export function isAssetImage(obj: FabricObject | undefined): obj is AssetImage {
  return !!obj && obj.type.toLowerCase() === "image";
}

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
  const preview: PreviewMeta = {
    previewWidthPx: img.width,
    previewHeightPx: img.height,
  };
  Object.assign(img, meta, preview);
  applyTouchControls(img);
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return img;
}

function previewSize(img: AssetImage) {
  const el = img.getElement() as HTMLImageElement | HTMLCanvasElement;
  const naturalW = "naturalWidth" in el ? el.naturalWidth : el.width;
  const naturalH = "naturalHeight" in el ? el.naturalHeight : el.height;
  return {
    w: img.previewWidthPx ?? (naturalW || img.width),
    h: img.previewHeightPx ?? (naturalH || img.height),
  };
}

/** Current crop as a normalised rectangle of the full image. */
export function getCrop(img: AssetImage): NormRect {
  const { w, h } = previewSize(img);
  return {
    x: img.cropX / w,
    y: img.cropY / h,
    w: img.width / w,
    h: img.height / h,
  };
}

/**
 * Applies a normalised crop. The photo keeps its printed width and centre, so
 * the customer sees it change shape in place; DPI updates accordingly.
 */
export function applyCrop(canvas: Canvas, rect: NormRect = FULL_RECT): void {
  const img = canvas.getActiveObject();
  if (!isAssetImage(img)) return;
  const { w, h } = previewSize(img);
  const printedWidthMm = img.getScaledWidth();
  const centre = img.getCenterPoint();
  img.set({
    cropX: rect.x * w,
    cropY: rect.y * h,
    width: rect.w * w,
    height: rect.h * h,
  });
  const scale = printedWidthMm / img.width;
  img.set({ scaleX: scale, scaleY: scale });
  img.setPositionByOrigin(new Point(centre.x, centre.y), "center", "center");
  img.setCoords();
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target: img });
}

/** Effective print DPI of an image object at its current size and crop, or null for non-images. */
export function objectDpi(obj: FabricObject | undefined): number | null {
  if (!isAssetImage(obj) || !obj.sourceWidthPx || !obj.sourceHeightPx)
    return null;
  const crop = getCrop(obj);
  return imageDpi({
    sourceWidthPx: obj.sourceWidthPx * crop.w,
    sourceHeightPx: obj.sourceHeightPx * crop.h,
    widthMm: obj.getScaledWidth(),
    heightMm: obj.getScaledHeight(),
  });
}
