import { describe, expect, it, vi } from "vitest";

// Node has no DOM: the engine's "fabric" runs on fabric's node build here.
vi.mock("fabric", async () => await import("fabric/node"));

import { StaticCanvas, Textbox } from "fabric";
import {
  attachTextAutoWidth,
  fitTextWidth,
} from "@/features/editor/engine/text-fit";
import { mug } from "@/config/products/mug";

const { widthMm, heightMm } = mug.printArea;

/** What Fabric's IText `updateFromTextArea` does on each keystroke. */
function typeInto(canvas: StaticCanvas, tb: Textbox, text: string) {
  const anchor = tb.getPositionByOrigin("center", "top");
  tb.text = text;
  tb.initDimensions();
  tb.setPositionByOrigin(anchor, "center", "top");
  tb.setCoords();
  canvas.fire("text:changed", { target: tb as never });
}

function setup() {
  const canvas = new StaticCanvas(undefined, {
    width: widthMm,
    height: heightMm,
  });
  attachTextAutoWidth(canvas as never);
  const tb = new Textbox("Your text", {
    left: widthMm / 2,
    top: heightMm / 2,
    originX: "center",
    originY: "center",
    width: 60,
    fontSize: heightMm * 0.2,
    textAlign: "center",
  });
  (tb as Textbox & { autoWidth?: boolean }).autoWidth = true;
  fitTextWidth(tb, widthMm); // as engine/text.ts addText does
  canvas.add(tb);
  return { canvas, tb };
}

describe("typing into auto-width text", () => {
  it("keeps the box where it is (no slide down per keystroke)", () => {
    const { canvas, tb } = setup();
    const top = () => tb.getPositionByOrigin("center", "top");
    const start = top();
    let typed = "";
    for (const ch of "Hello Ayesha") {
      typed += ch;
      typeInto(canvas, tb, typed);
      // Fabric pins the top edge while you type; it must not creep down.
      expect(top().y).toBeCloseTo(start.y, 6);
      expect(top().x).toBeCloseTo(start.x, 6);
    }
    expect(tb.getScaledWidth()).toBeGreaterThan(60); // it grew to hug the text
  });

  it("a new line grows the box downwards, its top stays put", () => {
    const { canvas, tb } = setup();
    typeInto(canvas, tb, "Eid");
    const top = tb.getPositionByOrigin("center", "top").y;
    typeInto(canvas, tb, "Eid\nMubarak");
    expect(tb.textLines).toHaveLength(2);
    expect(tb.getPositionByOrigin("center", "top").y).toBeCloseTo(top, 6);
  });
});
