import Link from "next/link";
import { pageWidthClass } from "@/components/ui/page";
import { SITE, whatsappUrl } from "@/config/site";

const LINKS = [
  { href: "/products", label: "All products" },
  { href: "/track", label: "Track your order" },
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/printing-guidelines", label: "Printing guidelines" },
] as const;

export function SiteFooter() {
  const wa = whatsappUrl();
  return (
    <footer className="bg-brand-900 text-brand-50 mt-12 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm">
      <div className={pageWidthClass("wide")}>
        <p className="font-display text-lg text-white">
          Giftified<span className="text-mint-300">.pk</span>
        </p>
        <p className="text-brand-100 mt-1">{SITE.tagline}</p>
        <nav aria-label="Footer" className="mt-6">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="focus-visible:ring-mint-300/60 inline-flex min-h-11 items-center rounded hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {wa && (
          <a
            href={wa}
            className="bg-mint-300 text-brand-900 hover:bg-mint-500 focus-visible:ring-mint-300/60 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Chat on WhatsApp
          </a>
        )}
        <p className="text-brand-200 mt-6 text-xs">
          © {new Date().getFullYear()} {SITE.name} · Cash on Delivery across
          Pakistan
        </p>
      </div>
    </footer>
  );
}
