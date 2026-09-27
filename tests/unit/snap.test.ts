import { describe, expect, it } from "vitest";
import {
  normalizeAngle,
  snapAngle,
  snapToTarget,
} from "@/features/editor/engine/snap";

describe("position snapping", () => {
  it("snaps inside the threshold and not outside it", () => {
    expect(snapToTarget(106, 108, 3)).toEqual({ value: 108, snapped: true });
    expect(snapToTarget(104, 108, 3)).toEqual({ value: 104, snapped: false });
  });
});

describe("rotation snapping", () => {
  it("normalises angles to 0–360", () => {
    expect(normalizeAngle(-10)).toBe(350);
    expect(normalizeAngle(725)).toBe(5);
  });

  it("locks to 0° from either side", () => {
    expect(snapAngle(3)).toEqual({ value: 0, snapped: true });
    expect(snapAngle(-4)).toEqual({ value: 0, snapped: true });
    expect(snapAngle(357)).toEqual({ value: 0, snapped: true });
  });

  it("locks to right angles", () => {
    expect(snapAngle(88)).toEqual({ value: 90, snapped: true });
    expect(snapAngle(183)).toEqual({ value: 180, snapped: true });
    expect(snapAngle(-92)).toEqual({ value: 270, snapped: true });
  });

  it("leaves other angles alone", () => {
    expect(snapAngle(20)).toEqual({ value: 20, snapped: false });
    expect(snapAngle(-30)).toEqual({ value: 330, snapped: false });
  });
});
