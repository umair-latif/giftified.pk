import type { Metadata } from "next";
import Link from "next/link";
import {
  DraftNotice,
  InfoPage,
  InfoSection,
  Todo,
} from "@/features/info/info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Giftified.pk stores about you and your order, who can see it, and how long we keep it.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      intro="In plain words: what we keep, why, and who sees it."
    >
      <DraftNotice />

      <InfoSection id="what-we-store" title="What we store">
        <ul>
          <li>
            <strong>Order details:</strong> your name, mobile number, delivery
            address and city, email if you give one, the products you ordered
            and the price.
          </li>
          <li>
            <strong>Your design:</strong> the layout of your design and the
            photos you upload for it, so we can print it.
          </li>
          <li>
            <strong>On your phone only:</strong> your cart and unfinished
            designs are saved in your browser so you don&rsquo;t lose them. They
            stay on your device until you order or clear your browser data.
          </li>
        </ul>
        <p>
          We don&rsquo;t take card or bank details: you pay in cash on delivery.
        </p>
      </InfoSection>

      <InfoSection id="why" title="Why we use it">
        <ul>
          <li>To confirm your order with you by phone or message.</li>
          <li>To print your design and deliver it.</li>
          <li>To answer your questions about an order.</li>
        </ul>
        <p>
          <Todo>
            TODO(founder): will we send marketing messages (e.g. Eid offers)? If
            yes, only with consent &ndash; describe how to opt in/out
          </Todo>
        </p>
      </InfoSection>

      <InfoSection id="who-sees-what" title="Who sees what">
        <ul>
          <li>
            <strong>Printing partners</strong> (in Gujrat/Sialkot) receive only
            the print file and a production sheet: order number, product,
            colour, size, print size and position, a preview and your city. We
            don&rsquo;t give them your phone number or address.
          </li>
          <li>
            <strong>Courier:</strong> receives your name, phone number and
            address so they can deliver and collect the cash.{" "}
            <Todo>TODO(founder): name the courier company/companies</Todo>
          </li>
          <li>
            <strong>Service providers</strong> that run the shop for us: website
            hosting, our order system and file storage. They store data on our
            behalf.{" "}
            <Todo>
              TODO(founder): confirm the list of providers to name (hosting,
              WooCommerce host, file storage) and where their servers are
            </Todo>
          </li>
        </ul>
        <p>
          We never sell your data.{" "}
          <Todo>TODO(founder): confirm this commitment</Todo>
        </p>
      </InfoSection>

      <InfoSection id="how-long" title="How long we keep it">
        <ul>
          <li>
            Photos and print files:{" "}
            <Todo>TODO(founder): deleted how many days after delivery?</Todo>
          </li>
          <li>
            Order records:{" "}
            <Todo>
              TODO(founder): how long order records are kept (accounting/tax
              needs)
            </Todo>
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cookies" title="Cookies and browser storage">
        <p>
          The shop uses your browser&rsquo;s storage to remember your cart and
          your unfinished designs. At the moment the shop has no advertising or
          tracking cookies.{" "}
          <Todo>
            TODO(founder): will we add analytics or ad pixels (Google Analytics,
            Meta Pixel)? If yes, list them here
          </Todo>
        </p>
      </InfoSection>

      <InfoSection id="your-choices" title="Your choices">
        <p>
          You can ask us to see, correct or delete the details we hold about
          you, or to delete your photos sooner.{" "}
          <Link href="/contact">Contact us</Link> and we&rsquo;ll help.{" "}
          <Todo>
            TODO(founder): how quickly we act on these requests, and anything we
            must keep by law
          </Todo>
        </p>
      </InfoSection>

      <p className="text-xs text-zinc-600">
        Last updated: <Todo>TODO(founder): date when this page is final</Todo>
      </p>
    </InfoPage>
  );
}
