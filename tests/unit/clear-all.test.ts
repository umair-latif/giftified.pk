import { StaticCanvas, Textbox } from "fabric";
import { describe, expect, it, vi } from "vitest";
import { clearAll } from "@/features/editor/engine/actions";
import { setBackgroundColour } from "@/features/editor/engine/background";
import { attachHistory } from "@/features/editor/engine/history";
import { mug } from "@/config/products/mug";

// Node has no DOM: the engine's "fabric" runs on fabric's node build here.
vi.mock("fabric", async () => await import("fabric/node"));

function setup() {
  const canvas = new StaticCanvas(undefined, { width: 10, height: 10 });
  // The editor uses an interactive Canvas; selection is not under test here.
  Object.assign(canvas, {
    getActiveObject: () => undefined,
    discardActiveObject: () => false,
  });
  const history = attachHistory(canvas as never, {
    onChange: () => {},
    afterRestore: () => {},
  });
  return { canvas, history };
}

describe("clear all", () => {
  it("removes every layer, background colour included", () => {
    const { canvas } = setup();
    setBackgroundColour(canvas, mug.printArea, "#ffe135");
    canvas.add(new Textbox("A"), new Textbox("B"), new Textbox("C"));
    clearAll(canvas as never);
    expect(canvas.getObjects()).toHaveLength(0);
  });

  it("is one undo step, and undo brings everything back", async () => {
    const { canvas, history } = setup();
    canvas.add(new Textbox("A"), new Textbox("B"), new Textbox("C"));
    history.reset();
    history.batch(() => clearAll(canvas as never));
    expect(canvas.getObjects()).toHaveLength(0);
    await history.undo();
    expect(canvas.getObjects()).toHaveLength(3);
    expect(history.canUndo()).toBe(false);
    await history.redo();
    expect(canvas.getObjects()).toHaveLength(0);
  });
});
