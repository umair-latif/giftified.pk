"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (offline page; push later). Production only: in `next dev`
 * a service worker would only get in the way of hot reload.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err: unknown) =>
        console.warn("[pwa] service worker failed", err),
      );
  }, []);
  return null;
}
