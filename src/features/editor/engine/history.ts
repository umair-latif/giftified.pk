import type { Canvas, FabricObject } from "fabric";
import { HistoryStack } from "./history-stack";

export interface CanvasHistory {
  undo(): Promise<void>;
  redo(): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Re-baseline after loading a draft (nothing to undo yet). */
  reset(): void;
  detach(): void;
}

interface Options {
  limit?: number;
  /** Called after every change to the stack (record, undo, redo, reset). */
  onChange: () => void;
  /** Re-apply non-serialised state (control styles, snapping) after a restore. */
  afterRestore: (objects: FabricObject[]) => void;
}

/**
 * Snapshot-based undo/redo. Each committed change (add, remove, end of a drag
 * or pinch, leaving text edit) stores the canvas JSON. Designs reference
 * uploaded images by URL, so snapshots stay small.
 */
export function attachHistory(canvas: Canvas, opts: Options): CanvasHistory {
  const serialize = () => JSON.stringify(canvas.toObject());
  const stack = new HistoryStack<string>(serialize(), opts.limit ?? 50);
  let restoring = false;
  let queue: Promise<void> = Promise.resolve();

  const record = () => {
    if (restoring) return;
    if (stack.push(serialize())) opts.onChange();
  };

  const restore = async (json: string | null) => {
    if (json === null) return;
    restoring = true;
    try {
      canvas.discardActiveObject();
      await canvas.loadFromJSON(json);
      opts.afterRestore(canvas.getObjects());
      canvas.requestRenderAll();
    } finally {
      restoring = false;
      opts.onChange();
    }
  };

  /** Commit an in-progress text edit so it becomes its own undo step. */
  const commitTextEdit = () => {
    const active = canvas.getActiveObject() as
      | (FabricObject & { isEditing?: boolean; exitEditing?: () => void })
      | undefined;
    if (active?.isEditing) active.exitEditing?.();
  };

  const offs = [
    canvas.on("object:added", record),
    canvas.on("object:removed", record),
    canvas.on("object:modified", record),
  ];

  const enqueue = (fn: () => Promise<void>) => {
    queue = queue.then(fn, fn);
    return queue;
  };

  return {
    undo: () =>
      enqueue(async () => {
        commitTextEdit();
        await restore(stack.undo());
      }),
    redo: () =>
      enqueue(async () => {
        commitTextEdit();
        await restore(stack.redo());
      }),
    canUndo: () => stack.canUndo(),
    canRedo: () => stack.canRedo(),
    reset: () => {
      stack.reset(serialize());
      opts.onChange();
    },
    detach: () => offs.forEach((off) => off()),
  };
}
