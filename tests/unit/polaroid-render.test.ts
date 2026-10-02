import { describe, expect, it } from "vitest";
import { installPolaroid } from "@/features/editor/engine/polaroid";

/** Records the shadow state at each drawing call. */
function fakeCtx() {
  const calls: { op: string; shadow: string }[] = [];
  const stack: string[] = [];
  const ctx = {
    shadowColor: "rgba(0,0,0,0.3)",
    shadowBlur: 3,
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    fillStyle: "",
    save() {
      stack.push(ctx.shadowColor);
    },
    restore() {
      ctx.shadowColor = stack.pop() ?? ctx.shadowColor;
    },
    fillRect() {
      calls.push({ op: "frame", shadow: ctx.shadowColor });
    },
  };
  return { ctx, calls };
}

describe("polaroid shadow", () => {
  it("the frame casts the shadow, the photo drawn on it does not", () => {
    class Img {
      frameShape: unknown = "polaroid";
      width = 100;
      height = 80;
      _render(ctx: { shadowColor: string }) {
        photo.push(ctx.shadowColor);
      }
      shouldCache() {
        return true;
      }
    }
    const photo: string[] = [];
    installPolaroid(Img);
    const { ctx, calls } = fakeCtx();
    new Img()._render(ctx as never);
    expect(calls).toEqual([{ op: "frame", shadow: "rgba(0,0,0,0.3)" }]);
    expect(photo).toEqual(["rgba(0,0,0,0)"]);
    expect(ctx.shadowColor).toBe("rgba(0,0,0,0.3)"); // restored for Fabric
  });
});
