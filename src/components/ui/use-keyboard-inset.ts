"use client";

import { useEffect, useState } from "react";

/** Below this the visual viewport shrank for something else (URL bar), not a keyboard. */
const MIN_KEYBOARD_PX = 120;

/**
 * How much of the layout viewport the on-screen keyboard covers, from the
 * Visual Viewport API (null when no keyboard is open). Fixed elements stay
 * pinned to the layout viewport, which on Android Chrome and iOS Safari does
 * not shrink for the keyboard.
 */
export interface KeyboardInset {
  /** Keyboard height over the layout viewport's bottom, px. */
  inset: number;
  /** Height of the part of the page still visible, px. */
  visibleHeight: number;
  /** How far the browser scrolled the visible part down (iOS), px. */
  top: number;
}

export function useKeyboardInset(): KeyboardInset | null {
  const [state, setState] = useState<KeyboardInset | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState((prev) => {
        if (inset < MIN_KEYBOARD_PX) return prev ? null : prev;
        const next = {
          inset: Math.round(inset),
          visibleHeight: Math.round(vv.height),
          top: Math.round(vv.offsetTop),
        };
        return prev &&
          prev.inset === next.inset &&
          prev.visibleHeight === next.visibleHeight &&
          prev.top === next.top
          ? prev
          : next;
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return state;
}
