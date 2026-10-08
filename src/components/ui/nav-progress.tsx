"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Fired by `startNavProgress()` for navigations that don't start from a link (router.push). */
const START_EVENT = "giftified:nav-start";

/** Show the bar for a programmatic navigation, e.g. right before `router.push`. */
export function startNavProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * Thin bar along the top of the screen while the next page loads, so a tap on
 * Account or Cart never looks like nothing happened. Starts on a tap on any
 * internal link, finishes when the URL changes. Instant (prefetched)
 * navigations finish before the short delay, so the bar never flashes.
 */
export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

/** Wait this long before showing anything (most navigations are instant). */
const SHOW_DELAY_MS = 120;
/** Give up if the page never arrives (offline, error page outside the app). */
const GIVE_UP_MS = 15_000;

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [width, setWidth] = useState(0); // 0 = hidden
  const [fading, setFading] = useState(false);
  const timers = useRef<number[]>([]);
  const running = useRef(false);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
  };

  // Start: a tap on an internal link to another page.
  useEffect(() => {
    const start = () => {
      if (running.current) return;
      running.current = true;
      clear();
      setFading(false);
      timers.current.push(
        window.setTimeout(() => {
          setWidth(12);
          // Creep towards 90 % (never reaches it) until the page arrives.
          timers.current.push(
            window.setInterval(
              () => setWidth((w) => (w ? w + (90 - w) * 0.08 : w)),
              200,
            ),
          );
        }, SHOW_DELAY_MS),
        window.setTimeout(() => finish(), GIVE_UP_MS),
      );
    };
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) return; // same page / #hash
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      clear();
    };
    // `finish` only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (!running.current) return;
    running.current = false;
    clear();
    setWidth((w) => {
      if (!w) return 0; // never shown: stay hidden
      timers.current.push(
        window.setTimeout(() => setFading(true), 150),
        window.setTimeout(() => {
          setWidth(0);
          setFading(false);
        }, 450),
      );
      return 100;
    });
  }

  // Finish: the new page's URL is in place.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      data-testid="nav-progress"
      data-active={width > 0 ? "true" : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className={`bg-brand-500 h-full shadow-[0_0_8px_var(--color-brand-400)] transition-[width,opacity] duration-200 ease-out ${
          fading || width === 0 ? "opacity-0" : "opacity-100"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
