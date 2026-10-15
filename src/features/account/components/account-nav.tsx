"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ACCOUNT_SECTIONS = [
  { href: "/account", label: "Overview", id: "overview" },
  { href: "/account/orders", label: "My orders", id: "orders" },
  { href: "/account/designs", label: "My designs", id: "designs" },
  { href: "/account/addresses", label: "Delivery address", id: "addresses" },
  { href: "/account/profile", label: "Profile and settings", id: "profile" },
] as const;

/**
 * Desktop account menu (left column). The right column is the page, so a
 * click only swaps that side; the current section is highlighted.
 */
export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account">
      <ul className="flex flex-col gap-1">
        {ACCOUNT_SECTIONS.map((s) => {
          const active =
            s.href === "/account"
              ? path === "/account"
              : path === s.href || path.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center rounded-xl px-3 font-semibold transition-colors ${
                  active
                    ? "bg-ink text-white"
                    : "text-ink hover:bg-soft active:bg-soft"
                }`}
                data-testid={`account-nav-${s.id}`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
