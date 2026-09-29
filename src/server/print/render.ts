import type { Canvas as NodeCanvas } from "canvas";
import type { FabricObject } from "fabric";
import { buildFrameClip } from "@/features/editor/engine/frame-shape";
import { parseAssetRef } from "@/features/editor/assets/asset-ref";
import { migrateDesignFonts } from "@/features/editor/fonts/migrate";
import { MM_PER_INCH, PRINT_DPI, printPixelSize } from "@/lib/units";
import { decodeOriginal } from "./decode-image";
import { toOriginalGeometry, type ImageGeometry } from "./original-image";
import { removeChunks, withSrgbChunk } from "./png";
import { registerServerFonts, serverFontFor } from "./server-fonts";
import type { PrintFile, RenderPrintFile } from "./types";

type Json = Record<string, unknown>;

const KEY = "__printImageKey";

interface PendingImage {
  assetId: string;
  saved: Json;
}

const isObj = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isImageType = (o: Json) =>
  typeof o.type === "string" && o.type.toLowerCase() === "image";

function serverFamily(stack: unknown): string {
  if (typeof stack !== "string") return stack as string;
  const font = serverFontFor(stack);
  if (!font) {
    throw new Error(
      `No server font for fontFamily "${stack}" — add it to src/server/print/server-fonts.ts`,
    );
  }
  return `'${font.family}'`;
}

/**
 * Deep-copies the Fabric JSON so it can be rendered on the server:
 * font stacks → the registered family (same name as in the browser), and every image's `src` blanked
 * (originals are attached after loading; nothing is fetched by URL).
 */
function prepareJson(fabric: Json) {
  const images: PendingImage[] = [];
  const walk = (o: Json): Json => {
    const out: Json = { ...o };
    if (typeof out.fontFamily === "string")
      out.fontFamily = serverFamily(out.fontFamily);
    if (Array.isArray(out.styles)) {
      out.styles = out.styles.map((s: unknown) =>
        isObj(s) && isObj(s.style) && typeof s.style.fontFamily === "string"
          ? {
              ...s,
              style: {
                ...s.style,
                fontFamily: serverFamily(s.style.fontFamily),
              },
            }
          : s,
      );
    }
    if (Array.isArray(out.objects))
      out.objects = out.objects.filter(isObj).map(walk);
    if (isObj(out.clipPath)) out.clipPath = walk(out.clipPath);
    if (isImageType(out)) {
      const assetId =
        (typeof out.assetId === "string" && out.assetId) ||
        parseAssetRef(out.src);
      if (!assetId) {
        throw new Error(
          "Image without an asset id — print files are only rendered from original uploads",
        );
      }
      out[KEY] = images.length;
      images.push({ assetId, saved: o });
      out.src = "";
      // Filters would be re-applied to a blank element; none are used today.
      out.filters = [];
      out.resizeFilter = undefined;
    }
    return out;
  };
  const objects = Array.isArray(fabric.objects)
    ? fabric.objects.filter(isObj).map(walk)
    : [];
  // Print files are artwork only: never a canvas background/overlay.
  const json: Json = { ...fabric, objects };
  for (const k of ["background", "backgroundImage", "overlay", "overlayImage"])
    delete json[k];
  return { json, images };
}

/**
 * The Fabric JSON the print canvas loads: fonts normalised exactly like the
 * editor/preview (old device stacks → our fonts, no style a font has no real
 * face for) and mapped to the registered family; images blanked for originals.
 * Exported for the font-parity test (tests/unit/font-parity.test.ts).
 */
export function preparePrintJson(fabric: Json) {
  return prepareJson(migrateDesignFonts(fabric));
}

async function loadOriginals(
  images: PendingImage[],
  resolveAsset: ((id: string) => Promise<Uint8Array>) | undefined,
): Promise<Map<string, NodeCanvas>> {
  const decoded = new Map<string, NodeCanvas>();
  if (images.length === 0) return decoded;
  if (!resolveAsset) {
    throw new Error(
      `renderPrintFile needs opts.resolveAsset: the design has images (asset ${images[0]?.assetId})`,
    );
  }
  // Sequential on purpose: originals can be ~50 MP; keep peak memory low.
  for (const { assetId } of images) {
    if (decoded.has(assetId)) continue;
    let bytes: Uint8Array;
    try {
      bytes = await resolveAsset(assetId);
    } catch (err) {
      throw new Error(`Original for asset ${assetId} could not be loaded`, {
        cause: err,
      });
    }
    if (!bytes || bytes.byteLength === 0) {
      throw new Error(`Original for asset ${assetId} is missing or empty`);
    }
    try {
      decoded.set(assetId, await decodeOriginal(bytes));
    } catch (err) {
      throw new Error(`Original for asset ${assetId} is not a readable image`, {
        cause: err,
      });
    }
  }
  return decoded;
}

function geometryFor(img: PendingImage, original: NodeCanvas): ImageGeometry {
  const { saved, assetId } = img;
  for (const [axis, stored, actual] of [
    ["width", saved.sourceWidthPx, original.width],
    ["height", saved.sourceHeightPx, original.height],
  ] as const) {
    if (typeof stored === "number" && Math.abs(stored - actual) > 1) {
      throw new Error(
        `Original for asset ${assetId} is ${original.width}×${original.height} px but the design expects ${axis} ${stored} px — wrong file?`,
      );
    }
  }
  return toOriginalGeometry(saved, {
    width:
      typeof saved.sourceWidthPx === "number"
        ? saved.sourceWidthPx
        : original.width,
    height:
      typeof saved.sourceHeightPx === "number"
        ? saved.sourceHeightPx
        : original.height,
  });
}

function eachObject(objects: FabricObject[], fn: (o: FabricObject) => void) {
  for (const o of objects) {
    fn(o);
    const children = (o as { getObjects?: () => FabricObject[] }).getObjects;
    if (typeof children === "function") eachObject(children.call(o), fn);
  }
}

/**
 * Renders a saved design to the production PNG: transparent, sRGB, exactly the
 * print area at `dpi` (default 300), pHYs set so it opens at the right size.
 * Scene units are mm; the viewport zoom is dpi / 25.4. Images are drawn from the
 * ORIGINAL uploads supplied by `opts.resolveAsset`.
 */
export const renderPrintFile: RenderPrintFile = async (doc, opts = {}) => {
  const dpi = opts.dpi ?? PRINT_DPI;
  const { width, height } = printPixelSize(
    doc.printArea.widthMm,
    doc.printArea.heightMm,
    dpi,
  );
  const { json, images } = preparePrintJson(doc.fabric);
  const originals = await loadOriginals(images, opts.resolveAsset);

  await registerServerFonts();
  const { StaticCanvas, FabricImage, Path } = await import("fabric/node");
  const canvas = new StaticCanvas(undefined, {
    width,
    height,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
    skipOffscreen: false,
  });
  try {
    await canvas.loadFromJSON(json);
    canvas.backgroundColor = "";
    canvas.overlayColor = "";

    eachObject(canvas.getObjects(), (obj) => {
      // Object caches are size-capped (fabric perfLimitSizeTotal) and would
      // silently downsample large objects at 300 DPI.
      obj.objectCaching = false;
      const key = (obj as unknown as Json)[KEY];
      if (!(obj instanceof FabricImage) || typeof key !== "number") return;
      const pending = images[key];
      const original = pending && originals.get(pending.assetId);
      if (!pending || !original) return;
      const g = geometryFor(pending, original);
      obj.setElement(original as unknown as HTMLCanvasElement, {
        width: g.width,
        height: g.height,
      });
      obj.set(g);
      // Frame shape: cut from the shape id for the ORIGINAL's pixel box (the
      // saved clip is in preview pixels); no id = plain rectangle.
      obj.clipPath =
        (buildFrameClip(
          Path as never,
          (obj as unknown as Json).frameShape,
          g.width,
          g.height,
        ) as FabricObject | null) ?? undefined;
      delete (obj as unknown as Json)[KEY];
    });

    canvas.setViewportTransform([
      dpi / MM_PER_INCH,
      0,
      0,
      dpi / MM_PER_INCH,
      0,
      0,
    ]);
    const node = canvas.getNodeCanvas();
    const ctx = node.getContext("2d");
    ctx.quality = "best";
    ctx.patternQuality = "best";
    canvas.renderAll();

    // pHYs = dpi (vendor software opens it at the physical size), sRGB tagged,
    // and no bKGD: a "background colour" hint has no place in a transparent print.
    const png = withSrgbChunk(
      removeChunks(
        new Uint8Array(node.toBuffer("image/png", { resolution: dpi })),
        "bKGD",
      ),
    );
    const file: PrintFile = { png, widthPx: width, heightPx: height, dpi };
    return file;
  } finally {
    await canvas.dispose();
  }
};
