import Link from "next/link";
import { TruckIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";
import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";
import { MobileMenu } from "./mobile-menu";

/**
 * Header for the shop pages (home, catalog, product, cart, checkout, info).
 * The editor keeps its focused AppHeader. 64 px high (80 px from `lg`), with
 * the same thick ink line as the home page's bands. Phones get a menu (burger)
 * on the left (it also holds Track your order); from `sm` up the links sit in
 * the header.
 */
export function SiteHeader() {
  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="border-ink sticky top-0 z-30 border-b-[3px] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-1 pr-1 pl-1 sm:pl-4 lg:h-20">
        <MobileMenu />
        <Link
          href="/"
          aria-label="DesignBanana home"
          className="focus-visible:ring-brand-600/20 mr-auto ml-1 rounded focus-visible:ring-2 focus-visible:outline-none sm:ml-0"
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
          href="/designs"
          className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 hidden h-11 items-center rounded-full px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none sm:flex"
        >
          Designs
        </Link>
        <Link
          href="/help"
          className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 hidden h-11 items-center rounded-full px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none sm:flex"
        >
          Help
        </Link>
        {/* Phones: Track lives in the menu, so the bigger logo has room. */}
        <Link
          href="/track"
          aria-label="Track your order"
          className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 hidden size-11 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none sm:grid"
        >
          <TruckIcon />
        </Link>
        <AccountLink />
        <CartLink />
      </div>
    </header>
  );
}
