/**
 * Polaroid frame: a white border round the photo, thicker at the bottom.
 *
 * The photo itself stays the image object (same crop, same DPI maths); the
 * border is drawn OUTSIDE its box by the image's own render, so it lives in
 * the same object, moves/rotates/prints with it, and the print renderer draws
 * it from the same `frameShape: "polaroid"` id. Pure geometry here; the
 * Fabric patch is installed once per Fabric build (browser and node).
 */
export const POLAROID = {
  /** Border widths as a fraction of the photo's width. */
  side: 0.06,
  top: 0.06,
  bottom: 0.22,
  colour: "#ffffff",
  /** Slight tilt applied when the frame is first chosen, degrees. */
  tiltDeg: -3,
} as const;

export interface LocalRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The white frame for a photo of `width` × `height` centred on the origin. */
export function polaroidFrame(width: number, height: number): LocalRect {
  const side = width * POLAROID.side;
  const top = width * POLAROID.top;
  const bottom = width * POLAROID.bottom;
  return {
    x: -width / 2 - side,
    y: -height / 2 - top,
    w: width + 2 * side,
    h: height + top + bottom,
  };
}

interface Drawable {
  frameShape?: unknown;
  width: number;
  height: number;
  _render(ctx: CanvasRenderingContext2D): void;
  shouldCache(): boolean;
}

const PATCHED = Symbol.for("giftified.polaroid");

/**
 * Teaches a FabricImage class to draw the polaroid border for images whose
 * `frameShape` is "polaroid". Idempotent. Pass `FabricImage` from "fabric"
 * (editor) or "fabric/node" (print renderer).
 */
export function installPolaroid(ImageClass: { prototype: unknown }): void {
  const proto = ImageClass.prototype as Drawable & { [PATCHED]?: boolean };
  if (proto[PATCHED]) return;
  proto[PATCHED] = true;
  const render = proto._render;
  const shouldCache = proto.shouldCache;
  proto._render = function (this: Drawable, ctx) {
    if (this.frameShape === "polaroid") {
      const f = polaroidFrame(this.width, this.height);
      ctx.save();
      ctx.fillStyle = POLAROID.colour;
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.restore();
    }
    render.call(this, ctx);
  };
  // The cache canvas is only as big as the photo; the border sticks out of it.
  proto.shouldCache = function (this: Drawable) {
    return this.frameShape === "polaroid" ? false : shouldCache.call(this);
  };
}
