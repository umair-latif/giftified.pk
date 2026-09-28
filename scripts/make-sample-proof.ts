/**
 * Writes a sample VendorProof.pdf for visual review with a real vendor.
 *
 *   pnpm exec tsx scripts/make-sample-proof.ts [out.pdf]
 *
 * Defaults to the OS temp folder so the PDF never lands in the repo.
 *
 * Uses the mug design fixture, scaled up to the exact 300 DPI print size so the
 * proof looks like a real order (the fixture preview is only 1080 px wide).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mug } from "@/config/products/mug";
import { printPixelSize } from "@/lib/units";
import { decodePng, encodePng, type RgbaImage } from "@/server/pdf/png";
import { buildVendorProof } from "@/server/pdf/vendor-proof";

function resizeNearest(src: RgbaImage, w: number, h: number): RgbaImage {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / w));
      out.set(
        src.data.subarray(
          (sy * src.width + sx) * 4,
          (sy * src.width + sx) * 4 + 4,
        ),
        (y * w + x) * 4,
      );
    }
  }
  return { width: w, height: h, data: out };
}

async function main() {
  const out = process.argv[2] ?? join(tmpdir(), "vendor-proof-sample.pdf");
  const preview = readFileSync(
    new URL("../tests/fixtures/design-mug-preview.png", import.meta.url),
  );
  const { width, height } = printPixelSize(
    mug.printArea.widthMm,
    mug.printArea.heightMm,
    mug.printDpi,
  );
  const printPng = encodePng(
    resizeNearest(decodePng(new Uint8Array(preview)), width, height),
  );

  const pdf = await buildVendorProof({
    orderId: 5123,
    createdAt: new Date().toISOString(),
    productId: "mug",
    productName: mug.name,
    colourName: mug.baseColors[0].name,
    quantity: 2,
    print: {
      widthMm: mug.printArea.widthMm,
      heightMm: mug.printArea.heightMm,
      dpi: mug.printDpi,
      placement:
        "Full wrap. Centre of the artwork opposite the handle; both ends meet at the handle.",
      offsetXMm: 0,
      offsetYMm: 0,
    },
    printPng,
    mockupPng: new Uint8Array(preview),
    customerCity: "Lahore",
    notes: "Gift for a birthday - please pack with extra bubble wrap.",
  });
  writeFileSync(out, pdf);
  console.log(`Wrote ${out} (${(pdf.length / 1024).toFixed(0)} KB)`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
