import Link from "next/link";
import { TruckIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";
import { CartLink } from "./cart-link";

/**
 * Header for the shop pages (home, catalog, product, cart, checkout, info).
 * The editor keeps its focused AppHeader. Account icon arrives with task 20.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 pr-1 pl-4">
        <Link href="/" aria-label="Giftified.pk home" className="mr-auto">
          <Wordmark />
        </Link>
        <Link
          href="/products"
          className="text-ink active:bg-mint-100 hidden h-11 items-center rounded-full px-3 text-sm font-medium sm:flex"
        >
          Products
        </Link>
        <Link
          href="/track"
          aria-label="Track your order"
          className="text-ink active:bg-mint-100 grid size-11 place-items-center rounded-full"
        >
          <TruckIcon />
        </Link>
        <CartLink />
      </div>
    </header>
  );
}
