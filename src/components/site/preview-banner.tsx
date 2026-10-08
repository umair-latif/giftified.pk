import { SITE } from "@/config/site";

/** Thin pre-launch notice above the shop header (`SITE.preview`). */
export function PreviewBanner() {
  if (!SITE.preview) return null;
  return (
    <p
      className="bg-sunny text-ink border-ink border-b-2 px-4 py-1.5 text-center text-xs font-semibold sm:text-sm"
      data-testid="preview-banner"
    >
      Preview: orders placed here aren&apos;t shipped yet.
    </p>
  );
}
