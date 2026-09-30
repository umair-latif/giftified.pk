/**
 * Site-wide contact details and links (header, footer, contact page).
 * Founder-owned: these are the real published details, edit them here.
 */
export const SITE = {
  name: "Giftified.pk",
  tagline: "Design it on your phone. Cash on Delivery across Pakistan.",
  /**
   * E.164 without "+", for https://wa.me/<number>. Empty = hide WhatsApp links.
   * TODO(founder): this is a German number; swap it for a Pakistani one when
   * there is one, so COD customers see a local contact.
   */
  whatsapp: "4915209144535",
  email: "brainmasala1@gmail.com",
  /** Shown on /contact. Pakistan Standard Time. */
  hours: "7am – 6pm PKT, every day",
  /** Full profile URLs. Empty ones are hidden automatically. */
  social: {
    instagram: "https://instagram.com/elyou.dgn",
    tiktok: "https://tiktok.com/@elyou.designs",
    // TODO(founder): add the Facebook and YouTube profile URLs when they exist.
    facebook: "",
    youtube: "",
  },
} as const;

export const whatsappUrl = (text?: string): string | null =>
  SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null;
