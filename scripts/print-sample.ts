/**
 * Renders tests/fixtures/design-mug.json (+ a generated sample photo) to
 * out/print-sample.png so a human can eyeball the print file.
 *
 *   pnpm print:sample
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "canvas";
import { renderPrintFile } from "@/server/print/render";
import type { DesignDocument } from "@/types/design";

const ORIGINAL = { width: 3000, height: 2000 };
const PREVIEW = { width: 1024, height: 683 };

/** A colourful "photo" with a grid and labels, so crop/scale are easy to check. */
function samplePhoto(): Uint8Array {
  const c = createCanvas(ORIGINAL.width, ORIGINAL.height);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, ORIGINAL.width, ORIGINAL.height);
  g.addColorStop(0, "#0ea5e9");
  g.addColorStop(0.5, "#a855f7");
  g.addColorStop(1, "#f97316");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ORIGINAL.width, ORIGINAL.height);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 6;
  for (let x = 0; x <= ORIGINAL.width; x += 250) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ORIGINAL.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ORIGINAL.height; y += 250) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ORIGINAL.width, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 220px 'Giftified Sans'";
  ctx.textAlign = "center";
  ctx.fillText("ORIGINAL", ORIGINAL.width / 2, ORIGINAL.height / 2 + 80);
  return new Uint8Array(c.toBuffer("image/jpeg", { quality: 0.92 }));
}

async function main() {
  const fixture = path.join(process.cwd(), "tests/fixtures/design-mug.json");
  const doc = JSON.parse(await readFile(fixture, "utf8")) as DesignDocument;
  const objects = doc.fabric.objects as unknown[];
  // Photo on the right: 40 mm wide, cropped to the middle 80% horizontally.
  const cropW = PREVIEW.width * 0.8;
  objects.push({
    type: "Image",
    version: "7.4.0",
    originX: "center",
    originY: "center",
    left: 188,
    top: 44.5,
    cropX: PREVIEW.width * 0.1,
    cropY: 0,
    width: cropW,
    height: PREVIEW.height,
    scaleX: 40 / cropW,
    scaleY: 40 / cropW,
    angle: -6,
    src: "asset:sample-photo",
    assetId: "sample-photo",
    sourceWidthPx: ORIGINAL.width,
    sourceHeightPx: ORIGINAL.height,
    previewWidthPx: PREVIEW.width,
    previewHeightPx: PREVIEW.height,
  });

  const { registerServerFonts } = await import("@/server/print/server-fonts");
  await registerServerFonts(); // the sample photo's label uses a server font
  const photo = samplePhoto();
  const started = performance.now();
  const file = await renderPrintFile(doc, {
    resolveAsset: async (id) => {
      if (id !== "sample-photo") throw new Error(`unknown asset ${id}`);
      return photo;
    },
  });
  const ms = Math.round(performance.now() - started);
  const out = path.join(process.cwd(), "out", "print-sample.png");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, file.png);
  console.log(
    `Wrote ${path.relative(process.cwd(), out)}: ${file.widthPx}×${file.heightPx} px @ ${file.dpi} DPI, ${(file.png.byteLength / 1024).toFixed(0)} KB, ${ms} ms`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
