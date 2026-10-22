import { SITE, offerIsLive } from "@/config/site";

/**
 * Thin pre-launch notice above the shop header (`SITE.preview`). Announcement bars are ink, never yellow.
 * Hidden while the offer bar is live, so the two never stack.
 */
export function PreviewBanner() {
  if (!SITE.preview || offerIsLive()) return null;
  return (
    <p
      className="bg-ink px-4 py-1.5 text-center text-sm font-semibold text-white"
      data-testid="preview-banner"
    >
      Preview: orders placed here aren&apos;t shipped yet.
    </p>
  );
}
