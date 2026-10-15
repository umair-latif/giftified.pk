import { buttonClass } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/ui/icons";
import { SITE, whatsappUrl } from "@/config/site";

/**
 * The WhatsApp number as text (people copy it or call it) plus the "Chat on
 * WhatsApp" button. Contact, Help and the home page help block use it.
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
      <p className="text-ink">
        or call / message{" "}
        <a
          href={`tel:+${SITE.whatsapp}`}
          className="text-accent-text font-semibold whitespace-nowrap underline"
          data-testid="whatsapp-number"
        >
          {SITE.whatsappDisplay}
        </a>
      </p>
    </div>
  );
}
