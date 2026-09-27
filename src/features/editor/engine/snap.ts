/**
 * Pure snapping maths (unit-tested; no Fabric imports).
 */

/** Screen-pixel distance within which an object's centre snaps to a guide. */
export const SNAP_DISTANCE_PX = 8;

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
