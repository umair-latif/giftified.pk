import Link from "next/link";
import { TruckIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";
import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";

/**
 * Header for the shop pages (home, catalog, product, cart, checkout, info).
 * The editor keeps its focused AppHeader.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 pr-1 pl-4">
        <Link
          href="/"
          aria-label="Giftified.pk home"
          className="focus-visible:ring-brand-600/20 mr-auto rounded focus-visible:ring-2 focus-visible:outline-none"
        >
          <Wordmark />
        </Link>
        <Link
          href="/products"
          className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 hidden h-11 items-center rounded-full px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none sm:flex"
        >
          Products
        </Link>
        <Link
          href="/track"
          aria-label="Track your order"
          className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 grid size-11 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <TruckIcon />
        </Link>
        <AccountLink />
        <CartLink />
      </div>
    </header>
  );
}
