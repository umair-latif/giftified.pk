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
      className="bg-mint-100 border-ink flex items-center gap-2 rounded-xl border-2 p-3 text-xs text-zinc-700"
      data-testid="editor-tip"
    >
      <p className="flex-1 leading-relaxed">
        <span className="text-ink font-semibold">Tip: </span>
        {touch
          ? "Drag to move (it snaps to the centre). Two fingers to resize and rotate. Double-tap text to edit."
          : "Drag to move (it snaps to the centre). Use the handles to resize and rotate. Double-click text to edit."}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="border-ink text-ink focus-visible:ring-brand-600/40 shrink-0 rounded-lg border-2 bg-white px-2 py-1 text-xs font-semibold hover:bg-white/70 focus-visible:ring-2 focus-visible:outline-none"
      >
        Got it
      </button>
    </div>
  );
}
