/**
 * Photo frame shapes ("Crop & shape"). Pure (no Fabric), unit-tested.
 *
 * A shape is an SVG path in a 0–100 unit square. It is stretched over the
 * photo's visible (cropped) box, so the editor, the 3D/2D preview and the
 * server print renderer all cut the same outline from the same `frameShape` id
 * stored on the image. The clip is rebuilt from the id wherever the photo's
 * pixel size changes (preview → original), never trusted from saved JSON.
 */
export const FRAME_SHAPES = [
  "circle",
  "rounded",
  "heart",
  "arch",
  "star",
  "polaroid",
] as const;
export type FrameShape = (typeof FRAME_SHAPES)[number];

export interface FrameShapeInfo {
  id: FrameShape;
  label: string;
  /** Frame width ÷ height the shape looks right in; null keeps the current one. */
  aspect: number | null;
  /** Closed SVG path in the 0–100 square. */
  path: string;
}

const starPath = (): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 50 : 21;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(
      `${(50 + r * Math.cos(a)).toFixed(2)} ${(52 + r * Math.sin(a)).toFixed(2)}`,
    );
  }
  return `M${pts.join("L")}Z`;
};

export const FRAME_SHAPE_INFO: Record<FrameShape, FrameShapeInfo> = {
  circle: {
    id: "circle",
    label: "Circle",
    aspect: 1,
    path: "M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z",
  },
  rounded: {
    id: "rounded",
    label: "Rounded",
    aspect: null,
    path: "M14 0H86A14 14 0 0 1 100 14V86A14 14 0 0 1 86 100H14A14 14 0 0 1 0 86V14A14 14 0 0 1 14 0Z",
  },
  heart: {
    id: "heart",
    label: "Heart",
    aspect: 1,
    path: "M50 100C12 68 0 46 0 28C0 12 12 0 27 0C38 0 46 6 50 15C54 6 62 0 73 0C88 0 100 12 100 28C100 46 88 68 50 100Z",
  },
  arch: {
    id: "arch",
    label: "Arch",
    aspect: 3 / 4,
    path: "M0 100V50A50 50 0 0 1 100 50V100Z",
  },
  star: {
    id: "star",
    label: "Star",
    aspect: 1,
    path: starPath(),
  },
  // Not a cut-out: the white border is drawn by `polaroid.ts`, so no clip.
  polaroid: {
    id: "polaroid",
    label: "Polaroid",
    aspect: 1,
    path: "",
  },
};

export function isFrameShape(v: unknown): v is FrameShape {
  return (
    typeof v === "string" && (FRAME_SHAPES as readonly string[]).includes(v)
  );
}

/** Minimal shape of Fabric's Path class, so browser and node builds can both be passed in. */
export interface PathCtor<T extends { width: number; height: number }> {
  new (
    d: string,
    options: Record<string, unknown>,
  ): T & {
    set(props: Record<string, unknown>): unknown;
  };
}

/**
 * The clip path for a photo whose visible box is `width` × `height` (in the
 * photo's own, unscaled pixels), centred on the photo. Returns null for
 * "no shape" or an unknown id. Uses the Path class of whichever Fabric build
 * (browser / node) the caller draws with.
 */
export function buildFrameClip<T extends { width: number; height: number }>(
  Path: PathCtor<T>,
  shape: unknown,
  width: number,
  height: number,
): T | null {
  if (!isFrameShape(shape) || !(width > 0) || !(height > 0)) return null;
  if (!FRAME_SHAPE_INFO[shape].path) return null; // border-only frame
  const clip = new Path(FRAME_SHAPE_INFO[shape].path, {
    originX: "center",
    originY: "center",
    left: 0,
    top: 0,
    objectCaching: false,
  });
  clip.set({ scaleX: width / clip.width, scaleY: height / clip.height });
  return clip;
}
