import type { Metadata } from "next";
import Link from "next/link";
import { SITE, whatsappUrl } from "@/config/site";
import { InfoPage, InfoSection, Todo } from "@/features/info/info-page";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Reach Giftified.pk on WhatsApp or email about your custom mug, t-shirt or hoodie order.",
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
            className="bg-brand-600 active:bg-brand-700 inline-flex h-12 items-center rounded-full px-6 font-medium text-white no-underline!"
          >
            Chat on WhatsApp
          </a>
        ) : (
          <p>
            <Todo>
              TODO(founder): WhatsApp number (set SITE.whatsapp in
              src/config/site.ts; the button appears automatically)
            </Todo>
          </p>
        )}
      </InfoSection>

      <InfoSection title="Email">
        {SITE.email ? (
          <p>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
        ) : (
          <p>
            <Todo>
              TODO(founder): support email (set SITE.email in
              src/config/site.ts)
            </Todo>
          </p>
        )}
      </InfoSection>

      <InfoSection title="When we reply">
        <p>
          <Todo>
            TODO(founder): opening hours and days (e.g. Mon&ndash;Sat, 10am
            &ndash; 7pm), and how quickly we usually reply
          </Todo>
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
          <Todo>
            TODO(founder): business address to show here, if any (or say we are
            online-only)
          </Todo>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
