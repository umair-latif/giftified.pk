"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

let nextId = 1;

/**
 * Makes the phone's Back button (Android system back, browser Back, the
 * iPhone swipe) close the open sheet or full-screen editor instead of leaving
 * the page: while the overlay is open it owns one history entry on top of the
 * page's. Back pops that entry and calls `onClose`; if the overlay is closed
 * some other way (Done, Cancel, ×, tapping outside), the entry is popped here
 * so the history stays as it was.
 *
 * The entry is added on the next tick, not in the effect itself: React's dev
 * Strict Mode mounts, unmounts and mounts again straight away, and a second
 * `history.back()` racing a second `pushState` would pop the wrong entry.
 */
export function useBackToClose(onClose: () => void): void {
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const id = nextId++;
    let pushed = false;
    let popped = false;

    const push = () => {
      // Keep the page's own state (Next.js keeps its router data in it).
      const state = { ...(window.history.state ?? {}), backOverlay: id };
      window.history.pushState(state, "");
      pushed = true;
    };
    const onPop = () => {
      // Back landed on an entry that isn't ours: ours was popped.
      if (!pushed || popped) return;
      if (
        (window.history.state as { backOverlay?: number } | null)
          ?.backOverlay === id
      )
        return; // a sheet above this one was popped
      popped = true;
      closeRef.current();
    };

    const timer = setTimeout(push, 0);
    window.addEventListener("popstate", onPop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      // Closed another way: remove our entry (not if Back already did).
      if (pushed && !popped) window.history.back();
    };
  }, []);
}
