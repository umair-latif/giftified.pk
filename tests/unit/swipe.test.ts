import { describe, expect, it } from "vitest";
import { SWIPE_MIN_PX, swipeDirection } from "@/components/ui/use-swipe";

describe("swipeDirection", () => {
  it("left swipe shows the next picture, right swipe the previous", () => {
    expect(swipeDirection(-80, 5)).toBe("next");
    expect(swipeDirection(80, -5)).toBe("prev");
  });

  it("ignores taps and short moves", () => {
    expect(swipeDirection(0, 0)).toBeNull();
    expect(swipeDirection(SWIPE_MIN_PX - 1, 0)).toBeNull();
    expect(swipeDirection(SWIPE_MIN_PX, 0)).toBe("prev");
  });

  it("ignores mostly-vertical moves (page scroll)", () => {
    expect(swipeDirection(-60, 120)).toBeNull();
  });
});
