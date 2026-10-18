/**
 * WooCommerce reviews can't carry a photo, so the review text ends with
 * `[photo: <link>]` while the review waits for the founder in WP admin (he
 * clicks it to see the photo). The shop strips it and shows the photo itself.
 */
const MARKER = /\s*\[photo: (https?:\/\/[^\]\s]+)\]\s*$/;

/** Customers can't type their own marker: it would point anywhere. */
export function neutralisePhotoMarker(text: string): string {
  return text.replace(/\[photo:/gi, "(photo:");
}

export function withPhotoMarker(text: string, photoUrl: string): string {
  return `${text}\n\n[photo: ${photoUrl}]`;
}

export function splitPhotoMarker(raw: string): {
  text: string;
  photoUrl?: string;
} {
  const m = MARKER.exec(raw);
  return m
    ? { text: raw.slice(0, m.index).trim(), photoUrl: m[1]! }
    : { text: raw.trim() };
}
