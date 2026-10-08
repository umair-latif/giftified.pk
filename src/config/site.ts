/**
 * Site-wide contact details and links (header, footer, contact page).
 * Founder-owned: these are the real published details, edit them here.
 */
export const SITE = {
  name: "DesignBanana",
  /**
   * Pre-launch "working pitch" phase (founder, 8 Oct 2026): products, photos
   * and prices are placeholders and orders are not shipped. Shows the thin
   * preview banner on shop pages. Set to false on launch day.
   */
  preview: true,
  /**
   * The one tagline (brand decision, 8 Oct 2026): sentence case, "khaas" with a
   * double a, no exclamation mark. Browser title, hero label, footer next to the logo.
   */
  tagline: "Kuch khaas banao",
  /**
   * E.164 without "+", for https://wa.me/<number>. Empty = hide WhatsApp links.
   * TODO(founder): this is a German number; swap it for a Pakistani one when
   * there is one, so COD customers see a local contact.
   */
  whatsapp: "4915209144535",
  /** TODO(founder): switch to an address on designbanana.pk once the domain has email. */
  email: "designbanana.admin@gmail.com",
  /** Shown on /contact. Pakistan Standard Time. */
  hours: "7am – 6pm PKT, every day",
  /** Full profile URLs. Empty ones are hidden automatically. */
  social: {
    instagram: "https://instagram.com/designbananapk",
    tiktok: "https://tiktok.com/@designbananapk",
    // TODO(founder): placeholders so the icons show; put the real profile URLs here.
    facebook: "https://facebook.com",
    youtube: "https://youtube.com",
  },
} as const;

export const whatsappUrl = (text?: string): string | null =>
  SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null;
