"use client";

import { useSyncExternalStore } from "react";

const KEY = "giftified:tip:editor-gestures";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Show until dismissed once on this device. */
function shouldShow(): boolean {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

function touchFirst(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/**
 * The drag / pinch / snap help, shown once: the first time someone opens the
 * editor on this device, until they close it.
 */
export function EditorTip() {
  const show = useSyncExternalStore(subscribe, shouldShow, () => false);
  const touch = useSyncExternalStore(subscribe, touchFirst, () => true);
  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Private mode: it just shows again next time.
    }
    listeners.forEach((l) => l());
  };

  return (
    <div
      className="bg-soft border-ink text-ink/80 flex items-center gap-2 rounded-2xl border-2 p-3 text-sm"
      data-testid="editor-tip"
    >
      <p className="flex-1 leading-relaxed">
        <span className="bg-highlight text-ink mr-1 rounded-full px-2 py-px text-xs font-semibold">
          Tip
        </span>
        {touch
          ? "Drag to move (it lines up with the centre and other items). Two fingers to resize and rotate. Double-tap text to change it."
          : "Drag to move (it lines up with the centre and other items). Use the handles to resize and rotate. Double-click text to change it."}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="border-ink text-ink lift press h-9 shrink-0 rounded-full border-2 bg-white px-3 text-sm font-semibold"
      >
        Got it
      </button>
    </div>
  );
}
