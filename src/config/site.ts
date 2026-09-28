/**
 * Site-wide contact details and links (header, footer, contact page).
 * TODO(founder): fill in the real WhatsApp number, email and social links.
 */
export const SITE = {
  name: "Giftified.pk",
  tagline: "Design it on your phone. Cash on Delivery across Pakistan.",
  /** E.164 without "+", for https://wa.me/<number>. Empty = hide WhatsApp links. */
  whatsapp: "",
  email: "",
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
} as const;

export const whatsappUrl = (text?: string): string | null =>
  SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null;
