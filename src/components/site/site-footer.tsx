import Link from "next/link";
import { SITE, whatsappUrl } from "@/config/site";

const LINKS = [
  { href: "/products", label: "All products" },
  { href: "/track", label: "Track your order" },
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  const wa = whatsappUrl();
  return (
    <footer className="bg-brand-900 text-brand-50 mt-12 px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm">
      <div className="mx-auto max-w-5xl">
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
                  className="inline-flex min-h-11 items-center"
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
            className="bg-mint-300 text-brand-900 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium"
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
