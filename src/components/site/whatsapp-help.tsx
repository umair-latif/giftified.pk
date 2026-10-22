import { buttonClass } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/ui/icons";
import { whatsappUrl } from "@/config/site";

/**
 * The "Chat on WhatsApp" button. Contact, Help and the home page help block
 * use it.
 *
 * The number itself is NOT shown, as text or as a `tel:` link (founder,
 * 22 Oct 2026): the current number is temporary. It goes back when the
 * permanent one exists — see the note on `SITE.whatsappDisplay`.
 */
export function WhatsappHelp({
  message,
  className = "",
}: {
  /** Pre-filled chat text. */
  message?: string;
  className?: string;
}) {
  const wa = whatsappUrl(message);
  if (!wa) return null;
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 ${className}`}
      data-testid="whatsapp-help"
    >
      <a href={wa} className={buttonClass("primary", "text-ink!")}>
        <WhatsappIcon width={22} height={22} />
        Chat on WhatsApp
      </a>
    </div>
  );
}
