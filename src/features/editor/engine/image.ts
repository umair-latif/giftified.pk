import {
  FabricImage,
  Path,
  Shadow,
  Point,
  type Canvas,
  type FabricObject,
} from "fabric";
import type { PrintArea } from "@/config/products";
import { imageDpi } from "@/lib/print-quality";
import { IMAGE_CUSTOM_PROPS } from "../assets/asset-ref";
import { applyTouchControls } from "./controls";
import { FULL_RECT, viewToRect, type NormRect } from "./crop";
import { buildFrameClip, isFrameShape, type FrameShape } from "./frame-shape";
import { initialImageWidthMm } from "./image-fit";
import { POLAROID, installPolaroid } from "./polaroid";
import {
  CARD,
  CARD_OUTER,
  cardSuitOf,
  installCardFrame,
  normaliseCardLetter,
} from "./card-frame";

// Serialise our asset metadata with every image (history, drafts, orders).
FabricImage.customProperties = [...IMAGE_CUSTOM_PROPS];
installPolaroid(FabricImage);
installCardFrame(FabricImage);

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

export type AssetImage = FabricImage &
  Partial<ImageAssetMeta & PreviewMeta> & {
    frameShape?: FrameShape;
    /** Playing-card frames: the corner letter. */
    frameLetter?: string;
    /** "Customer's photo": must be replaced before ordering. */
    placeholder?: boolean;
    /** Sample-library photo shown in a customer's photo. */
    sampleId?: string;
    /** Published design whose storage holds this photo's original. */
    templateAsset?: string;
  };

/** Makes the photo a "customer's photo" showing sample `sampleId`. */
export interface CustomerPhotoRole {
  sampleId: string;
}

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
export function applyCrop(
  canvas: Canvas,
  rect: NormRect = FULL_RECT,
  shape?: FrameShape | null,
  softShadow = false,
  letter?: string,
  /** The print area, so a new playing card fits inside its safe zone. */
  area?: PrintArea,
): void {
  const img = canvas.getActiveObject();
  if (!isAssetImage(img)) return;
  const wasCard = !!cardSuitOf(img.frameShape);
  if (shape !== undefined) setFrameShape(img, shape, softShadow);
  const isCard = !!cardSuitOf(img.frameShape);
  if (isCard) {
    if (letter !== undefined) img.frameLetter = normaliseCardLetter(letter);
    else if (img.frameLetter === undefined)
      img.frameLetter = CARD.defaultLetter;
  } else delete img.frameLetter;
  const { w, h } = previewSize(img);
  const printedWidthMm = img.getScaledWidth();
  const centre = img.getCenterPoint();
  img.set({
    cropX: rect.x * w,
    cropY: rect.y * h,
    width: rect.w * w,
    height: rect.h * h,
  });
  let scale = printedWidthMm / img.width;
  if (isCard && !wasCard) {
    // The card is ~1.65× wider and ~1.29× taller than the photo: when it is
    // first chosen, shrink it to fit the print area and pull it inside, so
    // the corner letters are never cut off.
    const fit = fitCardToArea(
      canvas,
      area,
      img.width * scale,
      img.height * scale,
    );
    scale *= fit.scale;
    centre.x = clamp(centre.x, fit.min.x, fit.max.x);
    centre.y = clamp(centre.y, fit.min.y, fit.max.y);
  }
  img.set({ scaleX: scale, scaleY: scale });
  img.setPositionByOrigin(new Point(centre.x, centre.y), "center", "center");
  refreshFrameClip(img);
  img.setCoords();
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target: img });
}

/**
 * How much a photo of `photoW` × `photoH` mm must shrink so its playing card
 * fits inside the print area's safe zone, and where its centre may then sit.
 * Without `area` the canvas is used (scene units are mm), with no margin.
 */
function fitCardToArea(
  canvas: Canvas,
  area: PrintArea | undefined,
  photoW: number,
  photoH: number,
) {
  const zoom = canvas.viewportTransform[0] || 1;
  const areaW = area?.widthMm ?? canvas.getWidth() / zoom;
  const areaH = area?.heightMm ?? canvas.getHeight() / zoom;
  const m = area?.safeMarginMm ?? 0;
  const cardW = photoW * CARD_OUTER.w;
  const cardH = photoH * CARD_OUTER.h;
  const scale = Math.min(1, (areaW - 2 * m) / cardW, (areaH - 2 * m) / cardH);
  const halfW = Math.min(areaW / 2, (cardW * scale) / 2);
  const halfH = Math.min(areaH / 2, (cardH * scale) / 2);
  return {
    scale,
    min: {
      x: Math.min(areaW / 2, m + halfW),
      y: Math.min(areaH / 2, m + halfH),
    },
    max: {
      x: Math.max(areaW / 2, areaW - m - halfW),
      y: Math.max(areaH / 2, areaH - m - halfH),
    },
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * Sets the shape. A polaroid also gets a slight tilt and, where the product
 * allows soft shadows (mugs), a drop shadow; leaving it undoes both.
 */
function setFrameShape(
  img: AssetImage,
  shape: FrameShape | null,
  softShadow: boolean,
) {
  const was = img.frameShape;
  const next = shape ?? undefined;
  if (was === next) return;
  img.frameShape = next;
  if (next === "polaroid") {
    if (Math.abs(img.angle) < 0.01) img.set({ angle: POLAROID.tiltDeg });
    if (softShadow)
      img.set({
        shadow: new Shadow({
          color: "rgba(0,0,0,0.3)",
          blur: 3,
          offsetX: 0.8,
          offsetY: 1.2,
          nonScaling: true, // millimetres, not photo pixels
        }),
      });
  } else if (was === "polaroid") {
    if (Math.abs(img.angle - POLAROID.tiltDeg) < 0.01) img.set({ angle: 0 });
    img.set({ shadow: null });
  }
}

/** The photo's frame shape (null = plain rectangle). */
export function getFrameShape(img: AssetImage): FrameShape | null {
  return isFrameShape(img.frameShape) ? img.frameShape : null;
}

/** The corner letter of a playing-card frame ("" = none or not a card). */
export function getFrameLetter(img: AssetImage): string {
  return cardSuitOf(img.frameShape) ? normaliseCardLetter(img.frameLetter) : "";
}

/** Rebuilds the clip from `frameShape` for the photo's current visible box. */
export function refreshFrameClip(img: AssetImage): void {
  img.clipPath =
    buildFrameClip(Path, img.frameShape, img.width, img.height) ?? undefined;
  img.dirty = true;
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

/**
 * Swaps the selected photo for another one, keeping its frame: same shape,
 * same printed size and centre. The new photo is cover-cropped to the
 * frame's current proportions, so it fills the shape like the old one did.
 */
export async function replaceImage(
  canvas: Canvas,
  previewUrl: string,
  meta: ImageAssetMeta,
  /** Designers: the new photo is a sample in a "customer's photo" slot. */
  role?: CustomerPhotoRole,
): Promise<void> {
  const img = canvas.getActiveObject();
  if (!isAssetImage(img)) return;
  const next = await FabricImage.fromURL(previewUrl);
  const frameAspect = img.getScaledWidth() / img.getScaledHeight();
  const printedWidthMm = img.getScaledWidth();
  const centre = img.getCenterPoint();
  const rect = viewToRect(next.width / next.height, {
    frameAspect,
    zoom: 1,
    center: { x: 0.5, y: 0.5 },
  });
  img.setElement(next.getElement());
  // A new photo: no longer the design's artwork or a sample, unless a
  // designer is filling a customer's-photo slot with one.
  img.placeholder = role ? true : undefined;
  img.sampleId = role?.sampleId;
  img.templateAsset = undefined;
  const preview: PreviewMeta = {
    previewWidthPx: next.width,
    previewHeightPx: next.height,
  };
  Object.assign(img, meta, preview);
  img.set({
    cropX: rect.x * next.width,
    cropY: rect.y * next.height,
    width: rect.w * next.width,
    height: rect.h * next.height,
  });
  const scale = printedWidthMm / img.width;
  img.set({ scaleX: scale, scaleY: scale });
  img.setPositionByOrigin(new Point(centre.x, centre.y), "center", "center");
  refreshFrameClip(img);
  img.setCoords();
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target: img });
}

/**
 * Designers: turn the selected customer's photo back into ordinary artwork
 * (the photo stays; customers no longer have to replace it). One undo step.
 */
export function clearCustomerPhoto(canvas: Canvas): void {
  const img = canvas.getActiveObject();
  if (!isAssetImage(img) || !img.placeholder) return;
  img.placeholder = undefined;
  img.sampleId = undefined;
  canvas.fire("object:modified", { target: img });
  canvas.requestRenderAll();
}

/** Where to put a "Sample photo" tag: the photo's centre, in scene units (mm). */
export interface SamplePhotoTag {
  /** Position among the design's sample photos (see `selectSamplePhoto`). */
  index: number;
  xMm: number;
  yMm: number;
  /** The photo is the selected layer (the selection bar already offers Replace). */
  selected: boolean;
}

function samplePhotos(canvas: Canvas): AssetImage[] {
  return canvas
    .getObjects()
    .filter((o): o is AssetImage => isAssetImage(o) && o.placeholder === true);
}

/** The photos a customer still has to replace, for the on-canvas tags. */
export function samplePhotoTags(canvas: Canvas): SamplePhotoTag[] {
  const active = canvas.getActiveObject();
  return samplePhotos(canvas).map((img, index) => {
    const c = img.getCenterPoint();
    return { index, xMm: c.x, yMm: c.y, selected: img === active };
  });
}

/** Selects the `index`-th sample photo, so Replace swaps that one. */
export function selectSamplePhoto(canvas: Canvas, index: number): boolean {
  const img = samplePhotos(canvas)[index];
  if (!img) return false;
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return true;
}

/** Selected photo's role: a customer's photo (with its sample) or artwork. */
export function customerPhotoOf(
  obj: FabricObject | undefined,
): { sampleId: string | null } | null {
  return isAssetImage(obj) && obj.placeholder === true
    ? { sampleId: obj.sampleId ?? null }
    : null;
}
