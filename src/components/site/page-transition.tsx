"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, useLayoutEffect, useRef, type ReactNode } from "react";
import { navDirection } from "./nav-direction";

/**
 * Page change animation (React <ViewTransition>, the browser's View
 * Transitions API): the page content slides a little and fades — forward when
 * going deeper in the shop flow, back when returning, a plain crossfade
 * between pages on the same level — while the headers stay put
 * (`view-transition-name` on them, see globals.css). Browsers without the API,
 * and phones set to "reduce motion", just swap pages as before.
 *
 * The direction is written to <html data-nav> in a layout effect: that runs
 * inside the commit, after the old page was captured and before the browser
 * starts the animations, so it works for links and `router.push` buttons
 * alike. The phone's own back button isn't a React transition, so it swaps
 * instantly — on purpose: phone browsers animate their back gesture
 * themselves. Keyed by pathname so each page enters and exits as a whole.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    document.documentElement.dataset.nav = navDirection(
      previous.current,
      pathname,
    );
    previous.current = pathname;
  }, [pathname]);

  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
