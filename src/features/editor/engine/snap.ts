/**
 * Pure snapping maths (unit-tested; no Fabric imports).
 */

/**
 * Screen-pixel distance within which an edge or centre snaps to a guide.
 * Small on purpose: a weak magnet, so placing something just off a line is
 * easy (it was 8 px, which made "slightly above the centre" impossible).
 */
export const SNAP_DISTANCE_PX = 6;

/**
 * Once snapped, moving this many screen px back away from the line lets go
 * (finger jitter below it doesn't). See `AxisSnapper`.
 */
export const SNAP_RELEASE_PX = 2;

/** Rotation snaps to multiples of this (0°, 90°, 180°, 270°)… */
export const SNAP_ANGLE_STEP = 90;
/** …when within this many degrees of one. */
export const SNAP_ANGLE_THRESHOLD = 5;

export interface SnapResult {
  value: number;
  snapped: boolean;
}

export function snapToTarget(
  value: number,
  target: number,
  threshold: number,
): SnapResult {
  return Math.abs(value - target) <= threshold
    ? { value: target, snapped: true }
    : { value, snapped: false };
}

export function normalizeAngle(angle: number): number {
  const a = angle % 360;
  return a < 0 ? a + 360 : a;
}

export function snapAngle(
  angle: number,
  step: number = SNAP_ANGLE_STEP,
  threshold: number = SNAP_ANGLE_THRESHOLD,
): SnapResult {
  const a = normalizeAngle(angle);
  const nearest = Math.round(a / step) * step;
  return Math.abs(a - nearest) <= threshold
    ? { value: normalizeAngle(nearest), snapped: true }
    : { value: a, snapped: false };
}

/** Axis-aligned box in scene units (mm). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The three lines of a box on one axis: start edge, centre, end edge. */
export function boxLines(b: Box, axis: "x" | "y"): [number, number, number] {
  const [a, z] = axis === "x" ? [b.left, b.right] : [b.top, b.bottom];
  return [a, (a + z) / 2, z];
}

export interface AxisSnap {
  /** Move the object by this much (scene units) to sit on the line. */
  delta: number;
  /** Where the line is (scene units). */
  at: number;
}

/**
 * Snapping on one axis for one drag, as a small state machine:
 *
 * - a line pulls the moving box's start edge, centre or end edge when one of
 *   them comes within `threshold` of it (the nearest pair wins);
 * - it stays snapped while the raw (unsnapped) position keeps getting closer
 *   or holds still within `release` of the closest it got;
 * - moving away by more than `release`, or past the line, lets go at once, and
 *   the same line only pulls again after the box has left its zone.
 *
 * So the magnet catches you on the way in, but a small nudge in either
 * direction always gets you off it: "slightly above the line" is possible.
 */
export class AxisSnapper {
  /** Per line: the closest raw distance reached since entering its zone. */
  private best = new Map<number, number>();
  /** Lines let go during this visit to their zone. */
  private released = new Set<number>();

  constructor(
    private threshold: number,
    private release: number,
  ) {}

  /** `edges`: the moving box's lines (raw); `targets`: lines it can snap to. */
  step(edges: readonly number[], targets: readonly number[]): AxisSnap | null {
    let hit: (AxisSnap & { dist: number }) | null = null;
    for (const t of new Set(targets)) {
      let dist = Infinity;
      let delta = 0;
      for (const e of edges)
        if (Math.abs(t - e) < dist) {
          dist = Math.abs(t - e);
          delta = t - e;
        }
      if (dist > this.threshold) {
        // Out of this line's zone: forget it, so it can pull again next time.
        this.best.delete(t);
        this.released.delete(t);
        continue;
      }
      if (this.released.has(t)) continue;
      const best = Math.min(this.best.get(t) ?? Infinity, dist);
      this.best.set(t, best);
      if (dist - best > this.release) {
        this.released.add(t);
        continue;
      }
      if (!hit || dist < hit.dist) hit = { delta, at: t, dist };
    }
    return hit && { delta: hit.delta, at: hit.at };
  }
}

/** Short vibration on Android when something locks into place. No-op elsewhere. */
export function haptic(ms = 8): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore: some browsers throw without a user gesture */
    }
  }
}
