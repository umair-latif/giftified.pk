/**
 * Site-wide contact details and links (header, footer, contact page).
 * Founder-owned: these are the real published details, edit them here.
 */
function isPreviewSite(): boolean {
  const flag = process.env.SITE_PREVIEW;
  if (flag === "1" || flag === "0") return flag === "1";
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV !== "production";
  return process.env.NODE_ENV === "development";
}

export const SITE = {
  name: "DesignBanana",
  /**
   * The thin "orders aren't shipped" banner. Launched 15 Oct 2026: never in
   * production; shown on Vercel preview deploys and in local dev so test
   * orders there are obvious. `SITE_PREVIEW=1` / `=0` overrides.
   */
  preview: isPreviewSite(),
  /**
   * The tagline as TEXT (brand decision, 8 Oct 2026): sentence case, "khaas"
   * with a double a, no exclamation mark. Browser title, footer next to the logo.
   * Inside artwork it is lettered in lowercase instead ("kuch khaas banao"),
   * like the wordmark (docs/brand.md). Never both forms on one screen — which
   * is why the hero's pill went when the picture started carrying the words.
   */
  tagline: "Kuch khaas banao",
  /** E.164 without "+", for https://wa.me/<number>. Empty = hide WhatsApp links. */
  whatsapp: "923369005786",
  /** The same number as people read and dial it (footer, Contact, Help). */
  whatsappDisplay: "+92 336 9005786",
  /**
   * The address customers write to and every customer-facing email is sent
   * from (Resend sends it, Cloudflare Email Routing forwards replies).
   */
  email: "hello@designbanana.pk",
  /** Shown on /contact. Pakistan Standard Time. */
  hours: "7am – 6pm PKT, every day",
  /** Full profile URLs. Empty ones are hidden automatically. */
  social: {
    instagram: "https://instagram.com/designbananapk",
    tiktok: "https://tiktok.com/@designbananapk",
    facebook: "https://www.facebook.com/DesignBananaPakistan/",
    youtube: "https://www.youtube.com/@DesignBananaPK",
  },
} as const;

export const whatsappUrl = (text?: string): string | null =>
  SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null;

/** Accessible names for the social links ("DesignBanana on Facebook"). */
export const SOCIAL_LABELS: Record<keyof typeof SITE.social, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
};
