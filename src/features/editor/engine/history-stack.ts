/**
 * Bounded undo/redo stack of immutable snapshots. Pure; no Fabric imports.
 * Index points at the snapshot that matches what is on screen.
 */
export class HistoryStack<T> {
  private items: T[];
  private index = 0;

  constructor(
    initial: T,
    private readonly limit = 50,
    private readonly equals: (a: T, b: T) => boolean = Object.is,
  ) {
    this.items = [initial];
  }

  /** Records a new state; drops any redo branch. Returns false for no-op pushes. */
  push(state: T): boolean {
    const current = this.items[this.index];
    if (current !== undefined && this.equals(current, state)) return false;
    this.items = this.items.slice(0, this.index + 1);
    this.items.push(state);
    if (this.items.length > this.limit) this.items.shift();
    this.index = this.items.length - 1;
    return true;
  }

  undo(): T | null {
    if (!this.canUndo()) return null;
    this.index -= 1;
    return this.items[this.index] ?? null;
  }

  redo(): T | null {
    if (!this.canRedo()) return null;
    this.index += 1;
    return this.items[this.index] ?? null;
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.items.length - 1;
  }

  /** Forget everything and start again from `state` (e.g. after loading a draft). */
  reset(state: T): void {
    this.items = [state];
    this.index = 0;
  }
}
