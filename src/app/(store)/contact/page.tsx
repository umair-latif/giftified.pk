import type { Metadata } from "next";
import Link from "next/link";
import { SITE, whatsappUrl } from "@/config/site";
import { InfoPage, InfoSection } from "@/features/info/info-page";
import { buttonClass } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Reach DesignBanana on WhatsApp or email about your custom mug, t-shirt or hoodie order.",
};

export default function ContactPage() {
  const wa = whatsappUrl(
    "Assalam o Alaikum! I have a question about my order.",
  );
  const socials = Object.entries(SITE.social).filter(([, url]) => url);

  return (
    <InfoPage
      title="Contact us"
      intro="Questions about a design, your order or delivery? We're happy to help."
    >
      <InfoSection title="WhatsApp">
        <p>
          The fastest way to reach us. Please include your order number if you
          have one.
        </p>
        {wa ? (
          <a
            href={wa}
            className={buttonClass("primary", "text-white! hover:text-white!")}
          >
            <WhatsappIcon width={22} height={22} />
            Chat on WhatsApp
          </a>
        ) : (
          <p>
            WhatsApp is temporarily unavailable &ndash; please email us instead.
          </p>
        )}
      </InfoSection>

      <InfoSection title="Email">
        {SITE.email ? (
          <p>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
        ) : (
          <p>Please reach us on WhatsApp.</p>
        )}
      </InfoSection>

      <InfoSection title="When we reply">
        <p>
          We are available {SITE.hours}. Messages that arrive outside those
          hours are answered the next morning.
        </p>
        <p>
          After you place an order we contact you ourselves to confirm it
          &ndash; you don&rsquo;t need to message us first.
        </p>
      </InfoSection>

      {socials.length > 0 && (
        <InfoSection title="Follow us">
          <ul>
            {socials.map(([name, url]) => (
              <li key={name}>
                <a href={url} className="capitalize">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </InfoSection>
      )}

      <InfoSection title="Before you write">
        <p>
          Many questions are answered in{" "}
          <Link href="/help">Help &amp; FAQ</Link>. To see where your order is,
          use <Link href="/track">Track your order</Link>.
        </p>
        <p>
          We are an online-only shop &ndash; there is no walk-in counter. Your
          order is printed by our partner workshops in and around Gujrat and
          Jhelum and sent straight to you by courier.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
