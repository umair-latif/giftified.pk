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
                className="bg-sunny text-ink border-ink focus-visible:ring-sunny/60 mt-4 inline-flex h-11 items-center rounded-2xl border-[3px] px-5 font-semibold hover:bg-[#ffd814] focus-visible:ring-2 focus-visible:outline-none"
              >
                Chat on WhatsApp
              </a>
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
                        className="focus-visible:ring-mint-300/60 inline-flex min-h-8 items-center rounded hover:text-white focus-visible:ring-2 focus-visible:outline-none"
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
        {socials.length > 0 && (
          <ul
            className="mt-8 flex justify-center gap-3"
            aria-label="Social media"
          >
            {socials.map(({ key, label, Icon, url }) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  data-testid={`social-${key}`}
                  className="focus-visible:ring-mint-300/60 inline-flex size-12 items-center justify-center rounded-full border-2 border-white/25 text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Icon width={26} height={26} />
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="text-brand-200 mt-6 border-t border-white/15 pt-5 text-center text-xs leading-relaxed">
          <p>
            © {new Date().getFullYear()} {SITE.name} ·{" "}
            <span className="text-white">{SITE.slogan}</span>
          </p>
          <p className="mt-1" data-testid="made-in">
            Made with <span aria-label="love">💚</span> in <PakistanFlag />
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Pakistan's flag as a tiny SVG: the 🇵🇰 emoji shows as the letters "PK" on
 * Windows. Proportions 3:2, white hoist band a quarter of the width.
 */
function PakistanFlag() {
  return (
    <svg
      viewBox="0 0 30 20"
      width={21}
      height={14}
      role="img"
      aria-label="Pakistan"
      className="inline-block rounded-[2px] align-[-2px] ring-1 ring-white/30"
    >
      <rect width="30" height="20" fill="#01411C" />
      <rect width="7.5" height="20" fill="#fff" />
      {/* Crescent: a white disc with a green disc cut out of it. */}
      <circle cx="19.2" cy="10" r="5.4" fill="#fff" />
      <circle cx="20.6" cy="8.7" r="4.6" fill="#01411C" />
      <polygon
        fill="#fff"
        transform="translate(22.4 7.4) rotate(-40)"
        points="0,-1.9 0.45,-0.6 1.8,-0.6 0.7,0.25 1.1,1.55 0,0.75 -1.1,1.55 -0.7,0.25 -1.8,-0.6 -0.45,-0.6"
      />
    </svg>
  );
}
