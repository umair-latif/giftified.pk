import {
  PDFDocument,
  StandardFonts,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { getProduct } from "@/config/products";
import { printPixelSize } from "@/lib/units";
import { pngSize, thumbnail } from "./png";
import { fmtMm, formatPkDate, redactPhones, safeText, wrapText } from "./text";
import type { BuildVendorProof, VendorProofInput } from "./types";

/**
 * VendorProof.pdf — one A4 page a print vendor can follow without questions.
 * Layout is authored in millimetres from the TOP-LEFT of the page (like the
 * editor); `Sheet` converts to PDF points from the bottom-left.
 */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14; // page margin
const CONTENT_W = PAGE_W - 2 * M;
const PT_PER_MM = 72 / 25.4;

/** Thumbnail limits: ~170 DPI across the drawn width, well under 2 MB total. */
const PRINT_THUMB = { maxW: 1200, maxH: 1200, budget: 900_000 };
const MOCKUP_THUMB = { maxW: 800, maxH: 800, budget: 450_000 };

const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.4, 0.43, 0.48);
const RULE = rgb(0.8, 0.82, 0.85);
const CHECKER = rgb(0.86, 0.87, 0.89);
const WARN = rgb(0.72, 0.1, 0.1);
const WHITE = rgb(1, 1, 1);

interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: Color;
  align?: "left" | "right" | "center";
}

class Sheet {
  constructor(
    readonly page: PDFPage,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {}

  font(bold?: boolean) {
    return bold ? this.bold : this.regular;
  }

  /** Width of text in mm. */
  width(text: string, size: number, bold?: boolean): number {
    const f = this.font(bold);
    return f.widthOfTextAtSize(safeText(f, text), size) / PT_PER_MM;
  }

  /** `y` is the text BASELINE in mm from the top. */
  text(str: string, x: number, y: number, o: TextOpts = {}) {
    const size = o.size ?? 11;
    const font = this.font(o.bold);
    const s = safeText(font, str);
    const w = font.widthOfTextAtSize(s, size) / PT_PER_MM;
    const dx = o.align === "right" ? -w : o.align === "center" ? -w / 2 : 0;
    this.page.drawText(s, {
      x: (x + dx) * PT_PER_MM,
      y: (PAGE_H - y) * PT_PER_MM,
      size,
      font,
      color: o.color ?? INK,
    });
  }

  /** Wrapped paragraph; returns the baseline y after the last line. */
  para(
    str: string,
    x: number,
    y: number,
    maxW: number,
    o: TextOpts & { lineMm?: number; maxLines?: number } = {},
  ) {
    const size = o.size ?? 11;
    const font = this.font(o.bold);
    let lines = wrapText(safeText(font, str), font, size, maxW * PT_PER_MM);
    if (o.maxLines && lines.length > o.maxLines) {
      lines = lines.slice(0, o.maxLines);
      lines[lines.length - 1] += " ...";
    }
    const lh = o.lineMm ?? size * 0.5;
    lines.forEach((l, i) => this.text(l, x, y + i * lh, o));
    return y + (lines.length - 1) * lh;
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    o: {
      fill?: Color;
      stroke?: Color;
      lineWidth?: number;
      dash?: number[];
    } = {},
  ) {
    this.page.drawRectangle({
      x: x * PT_PER_MM,
      y: (PAGE_H - y - h) * PT_PER_MM,
      width: w * PT_PER_MM,
      height: h * PT_PER_MM,
      ...(o.fill ? { color: o.fill } : {}),
      ...(o.stroke
        ? { borderColor: o.stroke, borderWidth: o.lineWidth ?? 0.75 }
        : {}),
      ...(o.dash ? { borderDashArray: o.dash } : {}),
    });
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    o: { color?: Color; width?: number; dash?: number[] } = {},
  ) {
    this.page.drawLine({
      start: { x: x1 * PT_PER_MM, y: (PAGE_H - y1) * PT_PER_MM },
      end: { x: x2 * PT_PER_MM, y: (PAGE_H - y2) * PT_PER_MM },
      thickness: o.width ?? 0.75,
      color: o.color ?? INK,
      ...(o.dash ? { dashArray: o.dash } : {}),
    });
  }

  image(img: PDFImage, x: number, y: number, w: number, h: number) {
    this.page.drawImage(img, {
      x: x * PT_PER_MM,
      y: (PAGE_H - y - h) * PT_PER_MM,
      width: w * PT_PER_MM,
      height: h * PT_PER_MM,
    });
  }

  /** Grey/white squares behind transparent artwork. */
  checkerboard(x: number, y: number, w: number, h: number, cell = 2.5) {
    this.rect(x, y, w, h, { fill: WHITE });
    for (let r = 0; r * cell < h; r++)
      for (let c = r % 2; c * cell < w; c += 2)
        this.rect(
          x + c * cell,
          y + r * cell,
          Math.min(cell, w - c * cell),
          Math.min(cell, h - r * cell),
          { fill: CHECKER },
        );
  }
}

function fit(w: number, h: number, maxW: number, maxH: number) {
  const k = Math.min(maxW / w, maxH / h);
  return { w: w * k, h: h * k };
}

function validate(input: VendorProofInput) {
  const p = input.print;
  if (!(p.widthMm > 0 && p.heightMm > 0 && p.dpi > 0))
    throw new Error("VendorProof: print width, height and dpi must be > 0");
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    throw new Error("VendorProof: quantity must be a positive integer");
}

export const buildVendorProof: BuildVendorProof = async (input) => {
  validate(input);
  const doc = await PDFDocument.create();
  const created = new Date(input.createdAt);
  const stamp = Number.isNaN(created.getTime()) ? new Date(0) : created;
  doc.setTitle(`Production proof - order ${input.orderId}`);
  doc.setAuthor("Giftified.pk");
  doc.setCreator("Giftified.pk");
  doc.setProducer("Giftified.pk");
  // Deterministic output: same input → same bytes.
  doc.setCreationDate(stamp);
  doc.setModificationDate(stamp);

  const page = doc.addPage([PAGE_W * PT_PER_MM, PAGE_H * PT_PER_MM]);
  const s = new Sheet(
    page,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
  );
  const p = input.print;
  const product = getProduct(input.productId);

  // ---- 1. Header ---------------------------------------------------------
  s.text("Giftified.pk — Production Proof", M, 20, { size: 15, bold: true });
  s.text(formatPkDate(input.createdAt), PAGE_W - M, 20, {
    size: 11,
    color: MUTED,
    align: "right",
  });
  s.text(`ORDER #${input.orderId}`, M, 33, { size: 30, bold: true });
  s.text(`QTY ${input.quantity}`, PAGE_W - M, 33, {
    size: 30,
    bold: true,
    align: "right",
  });
  s.line(M, 38, PAGE_W - M, 38, { color: RULE, width: 1 });

  // ---- 2. Product block ---------------------------------------------------
  const rows: [string, string][] = [
    ["Product", input.productName],
    ["Colour", input.colourName],
    ["Size", input.size ?? "One size"],
    // Quantity is already large in the header; a ready-made design shows its title instead.
    input.designTitle
      ? ["Design", input.designTitle]
      : ["Quantity", String(input.quantity)],
  ];
  rows.forEach(([k, v], i) => {
    const y = 46 + i * 7.5;
    s.text(k.toUpperCase(), M, y, { size: 9, color: MUTED });
    s.text(v, M + 24, y, { size: 14, bold: true });
  });
  const px = printPixelSize(p.widthMm, p.heightMm, p.dpi);
  const col2 = M + 110;
  s.text("PRINT AREA", col2, 46, { size: 9, color: MUTED });
  s.text(`${fmtMm(p.widthMm)} × ${fmtMm(p.heightMm)} mm`, col2, 53.5, {
    size: 18,
    bold: true,
  });
  s.text(`${px.width} × ${px.height} px at ${p.dpi} DPI`, col2, 61, {
    size: 11,
  });
  s.text("Transparent PNG · sRGB", col2, 68.5, { size: 11, color: MUTED });
  s.line(M, 77, PAGE_W - M, 77, { color: RULE, width: 1 });

  // ---- 3. Print artwork with dimensions -------------------------------------
  s.text("1  PRINT ARTWORK", M, 85, { size: 12, bold: true });
  s.text("checkerboard = transparent (do not print)", M + 42, 85, {
    size: 9,
    color: MUTED,
  });

  const thumb = thumbnail(
    input.printPng,
    PRINT_THUMB.maxW,
    PRINT_THUMB.maxH,
    PRINT_THUMB.budget,
  );
  const art = await doc.embedPng(thumb.png);
  const box = fit(p.widthMm, p.heightMm, CONTENT_W - 22, 58);
  const ix = M;
  const iy = 95;
  s.checkerboard(ix, iy, box.w, box.h);
  s.image(art, ix, iy, box.w, box.h);
  s.rect(ix, iy, box.w, box.h, { stroke: INK, lineWidth: 1 });

  // Width dimension (above).
  const dy = iy - 4;
  s.line(ix, dy, ix + box.w, dy, { width: 0.6 });
  s.line(ix, dy - 2, ix, iy, { width: 0.6 });
  s.line(ix + box.w, dy - 2, ix + box.w, iy, { width: 0.6 });
  const wLabel = `${fmtMm(p.widthMm)} mm`;
  const wLabelW = s.width(wLabel, 11, true) + 3;
  s.rect(ix + box.w / 2 - wLabelW / 2, dy - 2.5, wLabelW, 5, { fill: WHITE });
  s.text(wLabel, ix + box.w / 2, dy + 1.4, {
    size: 11,
    bold: true,
    align: "center",
  });

  // Height dimension (right).
  const dx = ix + box.w + 4;
  s.line(dx, iy, dx, iy + box.h, { width: 0.6 });
  s.line(ix + box.w, iy, dx + 2, iy, { width: 0.6 });
  s.line(ix + box.w, iy + box.h, dx + 2, iy + box.h, { width: 0.6 });
  s.text(`${fmtMm(p.heightMm)} mm`, dx + 2.5, iy + box.h / 2 + 1.4, {
    size: 11,
    bold: true,
  });

  // 10 mm scale bar (drawn at the same scale as the artwork).
  const scale = box.w / p.widthMm;
  let y = iy + box.h + 7;
  s.rect(ix, y - 2, 10 * scale, 2, { fill: INK });
  s.text(
    `= 10 mm on the product · drawing is ${Math.round(scale * 100)}% of actual size`,
    ix + 10 * scale + 2,
    y,
    { size: 9, color: MUTED },
  );

  // Guard: the PNG must be exactly the print area at the stated DPI.
  const real = pngSize(input.printPng);
  if (
    Math.abs(real.width - px.width) > 1 ||
    Math.abs(real.height - px.height) > 1
  ) {
    y += 6;
    s.text(
      `CHECK: attached PNG is ${real.width} × ${real.height} px, expected ${px.width} × ${px.height} px. Do not print - contact Giftified.pk.`,
      ix,
      y,
      { size: 10, bold: true, color: WARN },
    );
  }

  // ---- 4. Placement (+ optional mockup) --------------------------------------
  y += 11;
  const sectionTop = y;
  const hasMockup = input.mockupPng !== undefined;
  const colW = hasMockup ? 100 : CONTENT_W;
  s.text("2  PLACEMENT", M, y, { size: 12, bold: true });
  y = s.para(redactPhones(p.placement), M, y + 6.5, colW, {
    size: 11,
    maxLines: 3,
  });
  y += 5.5;
  s.text(
    `Offset from reference: X ${fmtMm(p.offsetXMm)} mm, Y ${fmtMm(p.offsetYMm)} mm  (+X = right, +Y = down)`,
    M,
    y,
    { size: 10, color: MUTED },
  );
  const diagramTop = y + 9;
  const diagramBottom = drawPlacementDiagram(s, art, {
    x: M,
    y: diagramTop,
    w: colW,
    productId: input.productId,
    edgeLabels: product?.edgeLabels,
    aspect: p.widthMm / p.heightMm,
    offsetXMm: p.offsetXMm,
    offsetYMm: p.offsetYMm,
  });

  let bodyBottom = diagramBottom;
  if (input.mockupPng) {
    const mx = M + colW + 6;
    const mw = CONTENT_W - colW - 6;
    const top = sectionTop;
    s.text("3  MOCKUP", mx, top, { size: 12, bold: true });
    s.text("for reference only", mx + 25, top, { size: 9, color: MUTED });
    const mt = thumbnail(
      input.mockupPng,
      MOCKUP_THUMB.maxW,
      MOCKUP_THUMB.maxH,
      MOCKUP_THUMB.budget,
    );
    const mock = await doc.embedPng(mt.png);
    const mb = fit(mt.width, mt.height, mw, 62);
    s.rect(mx, top + 4, mw, mb.h + 4, { stroke: RULE });
    s.image(mock, mx + (mw - mb.w) / 2, top + 6, mb.w, mb.h);
    bodyBottom = Math.max(bodyBottom, top + 8 + mb.h);
  }

  // ---- 5. Footer (anchored to the bottom) -----------------------------------
  const notes = input.notes?.trim()
    ? redactPhones(input.notes.trim())
    : undefined;
  // Notes get whatever room the body leaves (up to 4 lines, truncated with
  // "..."). The layout never throws: a proof must always be produced.
  const roomLines = Math.floor((PAGE_H - M - 26 - 3 - bodyBottom) / 5.5);
  const noteLines = notes
    ? Math.max(
        1,
        Math.min(
          4,
          roomLines,
          wrapText(
            safeText(s.regular, `Notes: ${notes}`),
            s.regular,
            11,
            CONTENT_W * PT_PER_MM,
          ).length,
        ),
      )
    : 0;
  const footerTop = PAGE_H - M - 26 - noteLines * 5.5;
  s.line(M, footerTop, PAGE_W - M, footerTop, { color: RULE, width: 1 });
  let fy = footerTop + 8;
  s.text(`Print at 100% · ${p.dpi} DPI · colours sRGB`, M, fy, {
    size: 14,
    bold: true,
  });
  fy += 7;
  s.text("Delivery city:", M, fy, { size: 11, color: MUTED });
  s.text(input.customerCity, M + 25, fy, { size: 11, bold: true });
  if (notes) {
    fy = s.para(`Notes: ${notes}`, M, fy + 6, CONTENT_W, {
      size: 11,
      lineMm: 5.5,
      maxLines: noteLines,
    });
  }
  s.text(
    `Giftified.pk · Order #${input.orderId} · The full-resolution PNG is sent with this proof. Questions go to Giftified.pk, not the customer.`,
    M,
    PAGE_H - M + 2,
    { size: 7.5, color: MUTED },
  );

  return doc.save();
};

interface DiagramOpts {
  x: number;
  y: number;
  w: number;
  productId: VendorProofInput["productId"];
  edgeLabels: { left: string; right: string } | undefined;
  aspect: number;
  offsetXMm: number;
  offsetYMm: number;
}

/** Returns the bottom y of the diagram. */
function drawPlacementDiagram(s: Sheet, art: PDFImage, o: DiagramOpts): number {
  if (o.productId === "mug") {
    // Unrolled wrap: the artwork IS the whole wrap; both short edges meet at the handle.
    const box = fit(o.aspect, 1, Math.min(o.w - 30, 110), 30);
    const x = o.x + 15;
    const y = o.y + 4;
    s.rect(x, y, box.w, box.h, { fill: WHITE });
    s.image(art, x, y, box.w, box.h);
    s.rect(x, y, box.w, box.h, { stroke: MUTED, lineWidth: 0.6 });
    const left = o.edgeLabels?.left ?? "Handle";
    const right = o.edgeLabels?.right ?? "Handle";
    for (const [ex, label] of [
      [x, left],
      [x + box.w, right],
    ] as const) {
      s.line(ex, y - 3, ex, y + box.h + 3, { width: 2.2, dash: [4, 2] });
      s.text(label.toUpperCase(), ex, y - 4.5, {
        size: 9,
        bold: true,
        align: "center",
      });
    }
    s.text("RIM (top of mug)", x + box.w / 2, y - 1.5, {
      size: 8,
      color: MUTED,
      align: "center",
    });
    s.text("BASE", x + box.w / 2, y + box.h + 4.5, {
      size: 8,
      color: MUTED,
      align: "center",
    });
    s.text(
      "Unrolled wrap. Both ends meet at the handle; the centre of the artwork faces away from it.",
      o.x,
      y + box.h + 10,
      { size: 9, color: MUTED },
    );
    return y + box.h + 10;
  }

  // Garments (schematic): portrait product front, reference point near the
  // top, print area hanging below it (nudged by the sign of the offsets).
  const fh = 36;
  const fw = 30;
  const x = o.x + 15;
  const y = o.y + 2;
  s.rect(x, y, fw, fh, { stroke: MUTED, lineWidth: 0.8 });
  s.text("PRODUCT FRONT (schematic, not to scale)", x + fw / 2, y + fh + 4.5, {
    size: 8,
    color: MUTED,
    align: "center",
  });
  const cx = x + fw / 2;
  const cy = y + 6;
  const area = fit(o.aspect, 1, fw * 0.6, fh * 0.55);
  const ax = Math.min(
    x + fw - area.w - 2,
    Math.max(x + 2, cx - area.w / 2 + Math.sign(o.offsetXMm) * 3),
  );
  const ay = Math.min(y + fh - area.h - 2, cy + 3 + Math.sign(o.offsetYMm) * 3);
  s.rect(ax, ay, area.w, area.h, { fill: WHITE });
  s.image(art, ax, ay, area.w, area.h);
  s.rect(ax, ay, area.w, area.h, { stroke: INK, lineWidth: 0.8, dash: [3, 2] });
  s.line(cx - 3, cy, cx + 3, cy, { width: 1 });
  s.line(cx, cy - 3, cx, cy + 3, { width: 1 });
  s.text("reference point", cx + 4, cy - 1.5, { size: 7.5, color: MUTED });
  return y + fh + 5;
}
