/**
 * Playing-card frames (founder, 2 Nov 2026): the photo sits in the window of
 * a red playing card, with the customer's letter ("K", "Q", their initial) in
 * the top-left corner and, turned upside down, in the bottom-right.
 *
 * Like the polaroid, the photo stays the image object (same crop, same DPI
 * maths) and the card is drawn by the image's own render, OUTSIDE and over its
 * box: it moves, rotates and prints with the photo, and the print renderer
 * draws it from the same `frameShape` + `frameLetter`. The artwork is vector
 * (traced once from the founder's PNGs, `card-frame-art.ts`), so it is sharp
 * at any print size.
 *
 * Units: the founder's artwork pixels, origin at the card centre. The photo
 * window is 463 × 834 of them; everything scales with the photo.
 */
import { CARD_FRAME_QUARTER, CARD_SUIT_PIP } from "./card-frame-art";

export const CARD_SUITS = ["heart", "diamond"] as const;
export type CardSuit = (typeof CARD_SUITS)[number];

export const CARD = {
  /** Photo window (the inside edge of the inner frame). */
  window: { w: 463, h: 834 },
  /** The card: 764 × 1078 with 59 px corners and a thin outline. */
  card: { w: 764, h: 1078, r: 59, line: 1.6 },
  /** The red of the artwork, sampled from the files. */
  colour: { heart: "#c61618", diamond: "#c51618" } as Record<CardSuit, string>,
  /**
   * Letter box in the top-left corner, above the pip: centred on the pip,
   * bottom edge 24 px above it, capitals as tall as `h`.
   */
  letter: { cx: -324.5, bottom: -414, h: 90, maxW: 92 },
  /** Serif like real cards; bold reads at small sizes. Same file in browser and print. */
  font: { family: "Giftified Serif", weight: "bold" as const },
  /** Up to two characters ("K", "Q", "10", initials). */
  maxLetters: 2,
  /** What a new card frame shows until the customer types their own. */
  defaultLetter: "K",
} as const;

/** Card width/height ÷ the photo's: how much room the card needs round the photo. */
export const CARD_OUTER = {
  w: CARD.card.w / CARD.window.w,
  h: CARD.card.h / CARD.window.h,
} as const;

/** "k" → "K", "10" stays, anything but A–Z/0–9 dropped, at most two. */
export function normaliseCardLetter(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CARD.maxLetters);
}

type Ctx = CanvasRenderingContext2D;

/**
 * The traced paths use only M, L, C and Z. Parsed once into numbers and drawn
 * with plain canvas calls: node-canvas (print) has no Path2D.
 */
type Op = ["M" | "L", number, number] | ["C", ...number[]] | ["Z"];
const parsed = new Map<string, Op[]>();
function ops(d: string): Op[] {
  let out = parsed.get(d);
  if (out) return out;
  out = [];
  for (const m of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = (m[2] ?? "")
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const cmd = m[1] as "M" | "L" | "C" | "Z";
    if (cmd === "Z") out.push(["Z"]);
    else if (cmd === "C") out.push(["C", ...n]);
    else out.push([cmd, n[0] ?? 0, n[1] ?? 0]);
  }
  parsed.set(d, out);
  return out;
}

/** Fills a traced path (holes cut out: even-odd). */
function fillPath(ctx: Ctx, d: string) {
  ctx.beginPath();
  for (const op of ops(d)) {
    if (op[0] === "M") ctx.moveTo(op[1], op[2]);
    else if (op[0] === "L") ctx.lineTo(op[1], op[2]);
    else if (op[0] === "C") {
      const [, a = 0, b = 0, c = 0, e = 0, f = 0, g = 0] = op;
      ctx.bezierCurveTo(a, b, c, e, f, g);
    } else ctx.closePath();
  }
  ctx.fill("evenodd");
}

function roundedRect(ctx: Ctx, w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Font size whose capitals are `CARD.letter.h` tall, narrowed to fit `maxW`. */
function letterFont(ctx: Ctx, text: string): string {
  const { family, weight } = CARD.font;
  const probe = 100;
  ctx.font = `${weight} ${probe}px "${family}"`;
  const cap = ctx.measureText("H").actualBoundingBoxAscent || probe * 0.7;
  const width = ctx.measureText(text).width || 1;
  const size = Math.min(
    (probe * CARD.letter.h) / cap,
    (probe * CARD.letter.maxW) / width,
  );
  return `${weight} ${size.toFixed(2)}px "${family}"`;
}

/** Pip and letter of the top-left corner (the caller turns it for the other). */
function drawCorner(ctx: Ctx, suit: CardSuit, letter: string) {
  fillPath(ctx, CARD_SUIT_PIP[suit]);
  if (!letter) return;
  ctx.font = letterFont(ctx, letter);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(letter, CARD.letter.cx, CARD.letter.bottom);
}

/**
 * Draws the card round a photo of `width` × `height` centred on the origin
 * (Fabric's local image space). Call AFTER the photo: the frame's corner arcs
 * lie over it, and the white card has a hole where the photo is.
 */
export function drawCardFrame(
  ctx: Ctx,
  width: number,
  height: number,
  suit: CardSuit,
  letter: string,
): void {
  const { window: win, card } = CARD;
  ctx.save();
  ctx.scale(width / win.w, height / win.h);
  // No shadow from the photo's own settings on any of the card's parts.
  ctx.shadowColor = "rgba(0,0,0,0)";

  // White card with the photo window cut out, then its thin outline.
  ctx.beginPath();
  roundedRect(ctx, card.w, card.h, card.r);
  ctx.rect(-win.w / 2, -win.h / 2, win.w, win.h);
  ctx.fillStyle = "#ffffff";
  ctx.fill("evenodd");
  ctx.beginPath();
  roundedRect(ctx, card.w - card.line, card.h - card.line, card.r);
  ctx.strokeStyle = CARD.colour[suit];
  ctx.lineWidth = card.line;
  ctx.stroke();

  ctx.fillStyle = CARD.colour[suit];
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    ctx.save();
    ctx.scale(sx, sy);
    fillPath(ctx, CARD_FRAME_QUARTER);
    ctx.restore();
  }

  const text = normaliseCardLetter(letter);
  drawCorner(ctx, suit, text);
  ctx.rotate(Math.PI);
  drawCorner(ctx, suit, text);
  ctx.restore();
}

export function cardSuitOf(shape: unknown): CardSuit | null {
  return shape === "card-heart"
    ? "heart"
    : shape === "card-diamond"
      ? "diamond"
      : null;
}

interface Drawable {
  frameShape?: unknown;
  frameLetter?: unknown;
  width: number;
  height: number;
  _render(ctx: Ctx): void;
  shouldCache(): boolean;
}

const PATCHED = Symbol.for("giftified.card-frame");

/**
 * Teaches a FabricImage class to draw the card for images whose `frameShape`
 * is a card. Idempotent. Pass `FabricImage` from "fabric" (editor) or
 * "fabric/node" (print renderer).
 */
export function installCardFrame(ImageClass: { prototype: unknown }): void {
  const proto = ImageClass.prototype as Drawable & { [PATCHED]?: boolean };
  if (proto[PATCHED]) return;
  proto[PATCHED] = true;
  const render = proto._render;
  const shouldCache = proto.shouldCache;
  proto._render = function (this: Drawable, ctx) {
    render.call(this, ctx);
    const suit = cardSuitOf(this.frameShape);
    if (suit)
      drawCardFrame(
        ctx,
        this.width,
        this.height,
        suit,
        normaliseCardLetter(this.frameLetter),
      );
  };
  // The cache canvas is only as big as the photo; the card sticks out of it.
  proto.shouldCache = function (this: Drawable) {
    return cardSuitOf(this.frameShape) ? false : shouldCache.call(this);
  };
}
