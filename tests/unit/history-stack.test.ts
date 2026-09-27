import { describe, expect, it } from "vitest";
import { HistoryStack } from "@/features/editor/engine/history-stack";

describe("HistoryStack", () => {
  it("undoes and redoes in order", () => {
    const h = new HistoryStack("a");
    h.push("b");
    h.push("c");
    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBe("b");
    expect(h.redo()).toBe("c");
    expect(h.redo()).toBeNull();
  });

  it("drops the redo branch on a new change", () => {
    const h = new HistoryStack("a");
    h.push("b");
    h.undo();
    h.push("x");
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe("a");
    expect(h.redo()).toBe("x");
  });

  it("ignores duplicate snapshots", () => {
    const h = new HistoryStack("a");
    expect(h.push("a")).toBe(false);
    expect(h.canUndo()).toBe(false);
  });

  it("keeps at most `limit` snapshots", () => {
    const h = new HistoryStack(0, 3);
    [1, 2, 3, 4].forEach((n) => h.push(n));
    expect(h.undo()).toBe(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBeNull();
  });

  it("reset clears history", () => {
    const h = new HistoryStack("a");
    h.push("b");
    h.reset("z");
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
