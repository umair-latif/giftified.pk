import { SITE } from "@/config/site";

/** Thin pre-launch notice above the shop header (`SITE.preview`). Announcement bars are ink, never yellow. */
export function PreviewBanner() {
  if (!SITE.preview) return null;
  return (
    <p
      className="bg-ink px-4 py-1.5 text-center text-sm font-semibold text-white"
      data-testid="preview-banner"
    >
      Preview: orders placed here aren&apos;t shipped yet.
    </p>
  );
}
