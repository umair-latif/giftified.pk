"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useSignedIn } from "@/features/auth/signed-in";
import { OCCASIONS } from "@/features/home/occasions";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/designs", label: "Ready-made designs" },
  { href: "/track", label: "Track your order" },
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About us" },
] as const;

const row =
  "text-ink focus-visible:ring-brand-600/20 flex h-10 items-center rounded-xl px-3 text-base font-medium transition-colors hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-2 focus-visible:outline-none";

/** The three burger lines; they turn into an ×. */
const LINE =
  "absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out motion-reduce:transition-none";

/**
 * Phone menu (burger), below `sm`: the header has room only for the logo and
 * three icons, so the shop's pages live here. Opens as a panel under the
 * header (positioned against the sticky header: its backdrop blur makes
 * `fixed` children relative to it anyway); closes on a link, Escape, the
 * backdrop or a page change. It stays mounted so it can slide and fade
 * (`invisible` when closed, so it is out of the tab order and the a11y tree);
 * the burger lines turn into an ×. No motion with prefers-reduced-motion.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const signedIn = useSignedIn();
  const panelId = useId();

  // A new page closes the menu (adjusting state during render, not an effect).
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 grid size-11 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        data-testid="menu-button"
      >
        <span aria-hidden className="relative block h-4 w-5">
          <span
            className={`${LINE} ${open ? "top-[7px] rotate-45" : "top-0"}`}
          />
          <span
            className={`${LINE} top-[7px] ${open ? "scale-x-0 opacity-0" : ""}`}
          />
          <span
            className={`${LINE} ${open ? "top-[7px] -rotate-45" : "top-[14px]"}`}
          />
        </span>
      </button>
      <>
        <div
          aria-hidden
          className={`bg-ink/30 absolute inset-x-0 top-full mt-[3px] h-dvh transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${
            open ? "visible opacity-100" : "invisible opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          id={panelId}
          aria-label="Menu"
          className={`border-ink bg-cream absolute inset-x-0 top-full mt-[3px] max-h-[calc(100dvh-5rem)] origin-top overflow-y-auto border-b-[3px] px-4 pt-3 pb-5 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
            open
              ? "visible translate-y-0 opacity-100"
              : "invisible -translate-y-3 opacity-0"
          }`}
          data-testid="mobile-menu"
        >
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={path === l.href ? "page" : undefined}
                  className={`${row} ${path === l.href ? "bg-mint-100" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={signedIn ? "/account" : "/sign-in"}
                className={row}
                onClick={() => setOpen(false)}
              >
                {signedIn ? "Your account" : "Sign in"}
              </Link>
            </li>
          </ul>
          <p className="text-ink mt-4 px-3 text-sm font-semibold">
            Gifts for every occasion
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 px-3">
            {OCCASIONS.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/occasions/${o.slug}`}
                  className="border-ink text-ink hover:bg-sunny focus-visible:ring-brand-600/20 inline-flex h-9 items-center rounded-full border-2 bg-white px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => setOpen(false)}
                >
                  {o.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </>
    </div>
  );
}
