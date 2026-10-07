"use client";

import { useRef, type PointerEvent } from "react";

/** A horizontal move longer than this (px) counts as a swipe. */
export const SWIPE_MIN_PX = 40;

/**
 * Pure: which way a pointer move swipes. Mostly-vertical moves (page scroll)
 * and short moves (taps) are not swipes.
 */
export function swipeDirection(
  dx: number,
  dy: number,
  min = SWIPE_MIN_PX,
): "prev" | "next" | null {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

/**
 * Pointer handlers for a left/right swipe on a picture. `only: "mouse"` is for
 * strips that already swipe natively on touch (scroll-snap) and just need
 * dragging with a mouse. Pair with `touch-action: pan-y` (Tailwind `touch-pan-y`)
 * so vertical page scrolling still works.
 */
export function useSwipe(
  onPrev: () => void,
  onNext: () => void,
  only?: "mouse",
) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (only && e.pointerType !== only) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dir = swipeDirection(e.clientX - s.x, e.clientY - s.y);
      if (dir === "prev") onPrev();
      else if (dir === "next") onNext();
    },
    onPointerCancel() {
      start.current = null;
    },
    // Stop the browser dragging the <img> as a file while swiping with a mouse.
    onDragStart(e: { preventDefault(): void }) {
      e.preventDefault();
    },
  };
}
