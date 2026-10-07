import { StaticCanvas, Textbox } from "fabric";
import { describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_BLEED_MM,
  backgroundColour,
  findBackground,
  isBackground,
  setBackgroundColour,
} from "@/features/editor/engine/background";
import { mug } from "@/config/products/mug";

// Node has no DOM: the engine's "fabric" runs on fabric's node build here.
vi.mock("fabric", async () => await import("fabric/node"));

const area = mug.printArea;

function setup() {
  const canvas = new StaticCanvas(undefined, { width: 10, height: 10 });
  const events: string[] = [];
  for (const name of [
    "object:added",
    "object:modified",
    "object:removed",
  ] as const)
    canvas.on(name, () => events.push(name));
  return { canvas, events };
}

describe("background colour layer", () => {
  it("adds a locked rect covering the print area, at the bottom", () => {
    const { canvas, events } = setup();
    canvas.add(new Textbox("Hi"));
    events.length = 0;
    setBackgroundColour(canvas, area, "#ffe135");
    const bg = canvas.getObjects()[0]!;
    expect(isBackground(bg)).toBe(true);
    // Covers the print area plus the bleed on every side.
    expect(bg.width).toBe(area.widthMm + 2 * BACKGROUND_BLEED_MM);
    expect(bg.height).toBe(area.heightMm + 2 * BACKGROUND_BLEED_MM);
    expect([bg.left, bg.top]).toEqual([
      -BACKGROUND_BLEED_MM,
      -BACKGROUND_BLEED_MM,
    ]);
    expect(bg.selectable).toBe(false);
    expect(bg.evented).toBe(false);
    expect(backgroundColour(canvas)).toBe("#ffe135");
    expect(events).toEqual(["object:added"]);
  });

  it("changing the colour edits the same layer (one modified event)", () => {
    const { canvas, events } = setup();
    setBackgroundColour(canvas, area, "#ffe135");
    events.length = 0;
    setBackgroundColour(canvas, area, "#ff3d8b");
    setBackgroundColour(canvas, area, "#ff3d8b"); // same: no event
    expect(canvas.getObjects()).toHaveLength(1);
    expect(backgroundColour(canvas)).toBe("#ff3d8b");
    expect(events).toEqual(["object:modified"]);
  });

  it("null removes it", () => {
    const { canvas } = setup();
    setBackgroundColour(canvas, area, "#ffe135");
    setBackgroundColour(canvas, area, null);
    expect(findBackground(canvas)).toBeNull();
    expect(backgroundColour(canvas)).toBeNull();
  });

  it("survives save and load (role is a saved prop)", async () => {
    const { canvas } = setup();
    setBackgroundColour(canvas, area, "#14b8a6");
    const json = canvas.toObject() as { objects: { role?: string }[] };
    expect(json.objects[0]?.role).toBe("background");
    const other = new StaticCanvas(undefined, { width: 10, height: 10 });
    await other.loadFromJSON(json);
    expect(backgroundColour(other)).toBe("#14b8a6");
  });
});
