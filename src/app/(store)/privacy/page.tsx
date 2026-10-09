import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/features/info/info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What DesignBanana stores about you and your order, who can see it, and how long we keep it.",
};

/**
 * Source of truth for the wording: docs/content/privacy.md (founder-approved).
 * Every promise here must match what the code does — see the "Engineering
 * follow-ups" list in that file (30-day deletion = task 24).
 */
export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      intro="In plain words: what we keep, why, and who sees it."
    >
      <InfoSection id="what-we-store" title="What we collect">
        <ul>
          <li>
            <strong>Order details:</strong> your name, mobile number, delivery
            address and city, email if you give one, the products you ordered,
            the price, and the network (IP) address the order was placed from.
          </li>
          <li>
            <strong>Your design:</strong> the layout of your design and the
            photos and text you upload for it, so we can print it.
          </li>
          <li>
            <strong>On your device only:</strong> your cart and unfinished
            designs are saved in your browser so you don&rsquo;t lose them. The
            details you type at checkout are kept only until you place the order
            or close the tab.
          </li>
        </ul>
        <p>
          We don&rsquo;t take card or bank details: you pay in cash on delivery.
        </p>
      </InfoSection>

      <InfoSection id="why" title="Why we use it">
        <ul>
          <li>To confirm your order with you by phone or message.</li>
          <li>To check, print and deliver your design.</li>
          <li>To answer your questions about an order.</li>
        </ul>
      </InfoSection>

      <InfoSection id="who-sees-what" title="Who sees what">
        <ul>
          <li>
            <strong>Printing partners:</strong> receive only the production
            sheet and high-resolution print file (order number, item, size,
            print graphics, and destination city). They do not receive your
            phone number or exact street address.
          </li>
          <li>
            <strong>Courier &amp; logistics partners:</strong> receive your
            recipient name, delivery address, and phone number solely to deliver
            your parcel and collect Cash on Delivery.
          </li>
          <li>
            <strong>Technical service providers:</strong> secure cloud hosting,
            database, file storage, and messaging providers that process data
            strictly on our behalf to run the website and send order
            confirmations.
          </li>
          <li>
            <strong>No data selling:</strong> we never sell, rent, or trade your
            personal information or uploaded designs to third parties or
            advertisers under any circumstances.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="marketing" title="Marketing messages">
        <p>
          We will only send you marketing or promotional messages (such as
          special Eid offers or discounts) if you explicitly tick the opt-in box
          during checkout. You can opt out at any time by{" "}
          <Link href="/contact">contacting support</Link>.
          {/* TODO(founder): once WhatsApp/SMS messaging is live, add "or by replying STOP to any message". */}
        </p>
      </InfoSection>

      <InfoSection id="how-long" title="How long we keep things">
        <ul>
          <li>
            <strong>Photos &amp; designs (guest orders):</strong> uploaded
            photos and canvas layers are automatically purged from our servers
            30 days after your order has been successfully delivered.
          </li>
          <li>
            <strong>Photos &amp; designs (with an account):</strong> if you
            order while signed in, your designs and their photos stay in your
            account so you can order again or keep editing, until you delete
            them or close your account. Deleting a design or your account
            removes its photos from our servers.
          </li>
          <li>
            <strong>Print files:</strong> the high-resolution print files made
            for production are purged 30 days after delivery for every order.
          </li>
          <li>
            <strong>Order &amp; transaction records:</strong> basic order
            details (name, address, purchased items, total price) are kept for
            up to 3 years to fulfil legal, accounting, and tax requirements
            under Pakistani business regulations.
          </li>
        </ul>
      </InfoSection>

      <InfoSection
        id="compliance"
        title="Uploaded content and legal compliance"
      >
        <ul>
          <li>
            <strong>Design review:</strong> every design is checked by our team
            before it is printed. Approved designs are kept only for as long as
            described above.
          </li>
          <li>
            <strong>Refused content:</strong> if a design is refused because it
            breaks the law, including the Prevention of Electronic Crimes Act
            (PECA), we may keep the uploaded file and the related order details
            (including phone number and IP address) instead of deleting them
            after 30 days.
          </li>
          <li>
            <strong>Law enforcement:</strong> we cooperate with the National
            Cyber Crime Investigation Agency (NCCIA) and the Federal
            Investigation Agency (FIA). If an upload constitutes a criminal
            offence under PECA &ndash; such as blasphemy, incitement of
            inter-faith or sectarian hatred, state defamation, or child
            exploitation &ndash; we will hand over the related order details,
            contact numbers, and IP addresses to the relevant authorities on
            official request.
          </li>
        </ul>
        <p>
          What we don&rsquo;t print is listed in our{" "}
          <Link href="/printing-guidelines">Printing guidelines</Link>.
        </p>
      </InfoSection>

      <InfoSection id="cookies" title="Cookies and browser storage">
        <p>
          We use essential browser storage (<code>localStorage</code> and{" "}
          <code>sessionStorage</code>) solely to keep track of your active cart,
          draft designs and the checkout form you are filling in, on your
          device. We do not use third-party cross-site tracking cookies or
          advertising pixels without your explicit consent.
        </p>
      </InfoSection>

      <InfoSection id="your-choices" title="Your choices">
        <p>
          You can ask us to see, correct or delete the details we hold about
          you, or to delete your photos sooner.{" "}
          <Link href="/contact">Contact us</Link> and we&rsquo;ll reply within 7
          working days. Order records we must keep for accounting and tax (see
          above) can only be deleted once that period has ended.
        </p>
      </InfoSection>

      <p className="text-xs text-zinc-600">Last updated: September 2026</p>
    </InfoPage>
  );
}
