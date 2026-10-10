import { describe, expect, it } from "vitest";
import {
  AxisSnapper,
  boxLines,
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

describe("AxisSnapper: a weak magnet you can always nudge off", () => {
  // Threshold 6, release 2 (screen px at zoom 1). Moving box = one edge here.
  const run = (path: number[], targets = [100]) => {
    const s = new AxisSnapper(6, 2);
    return path.map((x) => s.step([x], targets));
  };

  it("catches on the way in and holds while still approaching", () => {
    const r = run([120, 105, 102, 101]);
    expect(r[0]).toBeNull();
    expect(r.slice(1)).toEqual([
      { delta: -5, at: 100 },
      { delta: -2, at: 100 },
      { delta: -1, at: 100 },
    ]);
  });

  it("lets go when moved back away by more than the release distance", () => {
    // Snapped at 101, then finger moves back up to 104: free, 4 above the line.
    const r = run([120, 101, 102, 104]);
    expect(r[1]).not.toBeNull();
    expect(r[2]).not.toBeNull(); // 1 px of jitter: still held
    expect(r[3]).toBeNull();
  });

  it("lets go after crossing the line, and doesn't grab again in the same visit", () => {
    const r = run([110, 103, 100, 97, 96, 99]);
    expect(r[1]?.at).toBe(100);
    expect(r[2]?.at).toBe(100);
    expect(r[3]).toBeNull(); // 3 past the line
    expect(r[5]).toBeNull(); // coming back inside the zone: still free
  });

  it("pulls again after leaving the zone", () => {
    const r = run([103, 99, 96, 90, 104]);
    expect(r[1]?.at).toBe(100);
    expect(r[2]).toBeNull(); // past the line: released
    expect(r[3]).toBeNull(); // out of the zone
    expect(r[4]?.at).toBe(100); // came back from outside: pulls again
  });

  it("picks the nearest of several lines and edges", () => {
    const s = new AxisSnapper(6, 2);
    // Box edges 40 / 50 / 60 against lines 63 and 52: the centre is 2 from 52.
    expect(s.step([40, 50, 60], [63, 52])).toEqual({ delta: 2, at: 52 });
  });

  it("side by side: a box's left edge lands on the other's right edge", () => {
    const s = new AxisSnapper(6, 2);
    const other = boxLines({ left: 10, right: 60, top: 0, bottom: 40 }, "x");
    const moving = boxLines({ left: 64, right: 104, top: 0, bottom: 40 }, "x");
    expect(s.step(moving, other)).toEqual({ delta: -4, at: 60 });
  });
});
