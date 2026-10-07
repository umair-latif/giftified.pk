import Link from "next/link";
import { pageWidthClass } from "@/components/ui/page";
import { WordmarkOnDark } from "@/components/ui/wordmark";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@/components/ui/icons";
import { SITE, whatsappUrl } from "@/config/site";

const SOCIALS = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
] as const;

const GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/track", label: "Track your order" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help", label: "Help & FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/about", label: "About us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/printing-guidelines", label: "Printing guidelines" },
    ],
  },
] as const;

export function SiteFooter() {
  const wa = whatsappUrl();
  const socials = SOCIALS.flatMap((s) =>
    SITE.social[s.key] ? [{ ...s, url: SITE.social[s.key] }] : [],
  );
  return (
    <footer className="bg-brand-900 text-brand-50 mt-12 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm">
      <div className={pageWidthClass("wide")}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-x-8">
          <div className="col-span-2 md:col-span-1">
            <p>
              <WordmarkOnDark />
            </p>
            <p className="text-brand-100 mt-1">{SITE.tagline}</p>
            {wa && (
              <a
                href={wa}
                className="bg-mint-300 text-brand-900 hover:bg-mint-500 focus-visible:ring-mint-300/60 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                Chat on WhatsApp
              </a>
            )}
            {socials.length > 0 && (
              <ul className="mt-3 flex gap-1" aria-label="Social media">
                {socials.map(({ key, label, Icon, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      data-testid={`social-${key}`}
                      className="focus-visible:ring-mint-300/60 inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <Icon />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <nav aria-label="Footer" className="contents">
            {GROUPS.map((g) => (
              <div
                key={g.title}
                className={
                  g.title === "Legal" ? "col-span-2 md:col-span-1" : ""
                }
              >
                <p className="text-mint-300 text-xs font-semibold tracking-wide uppercase">
                  {g.title}
                </p>
                <ul className="mt-1">
                  {g.links.map((l) => (
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
              </div>
            ))}
          </nav>
        </div>
        <p className="text-brand-200 mt-8 text-xs">
          © {new Date().getFullYear()} {SITE.name} · Cash on Delivery across
          Pakistan
        </p>
      </div>
    </footer>
  );
}
