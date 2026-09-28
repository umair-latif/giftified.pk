import type { Metadata } from "next";
import Link from "next/link";
import {
  DraftNotice,
  InfoPage,
  InfoSection,
  Todo,
} from "@/features/info/info-page";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for ordering custom products from Giftified.pk: orders, Cash on Delivery, reprints and content rules.",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of sale"
      intro="The rules for ordering from Giftified.pk, in plain words."
    >
      <DraftNotice />

      <InfoSection id="who" title="Who we are">
        <p>
          Giftified.pk sells custom-printed products that you design on this
          website.{" "}
          <Todo>
            TODO(founder): legal business name, registration (if any) and
            business address
          </Todo>
        </p>
      </InfoSection>

      <InfoSection id="orders" title="Orders">
        <ul>
          <li>
            When you place an order you make an offer to buy. The order is
            accepted only after we have confirmed it with you by phone or
            message.
          </li>
          <li>
            We only print confirmed orders. If we can&rsquo;t reach you to
            confirm, we may cancel the order.
          </li>
          <li>
            Prices are in Pakistani rupees (PKR). The price and delivery charge
            shown at checkout are the ones you pay.{" "}
            <Todo>
              TODO(founder): what happens if a price shown was clearly wrong
            </Todo>
          </li>
          <li>
            Products are made to order from your design. Please check spelling,
            names and dates before you order: we print what you design.
          </li>
          <li>
            Colours on your screen may look slightly different from the printed
            product, and printing on a curved mug or on fabric can vary a little
            in position.{" "}
            <Todo>TODO(founder): acceptable position tolerance, if any</Todo>
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cod" title="Cash on Delivery">
        <ul>
          <li>You pay the full amount in cash to the courier on delivery.</li>
          <li>
            Please only confirm an order you intend to receive. Each item is
            made just for you and can&rsquo;t be resold.{" "}
            <Todo>
              TODO(founder): what happens if a confirmed parcel is refused at
              the door (e.g. future orders need advance payment?)
            </Todo>
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cancellations" title="Changes and cancellations">
        <p>
          You can change or cancel an order until you confirm it with us. After
          that it goes to printing.{" "}
          <Todo>TODO(founder): cancellation rules after confirmation</Todo>
        </p>
      </InfoSection>

      <InfoSection id="reprints" title="Damaged or misprinted items">
        <p>
          If your item arrives damaged, or the print doesn&rsquo;t match your
          design, <Link href="/contact">contact us</Link> with photos.{" "}
          <Todo>
            TODO(founder): reprint/refund policy &ndash; time limit to report,
            what qualifies, reprint or refund, whether the item must be returned
          </Todo>
        </p>
        <p>
          Blurry prints caused by a low-resolution photo that the editor warned
          about are not a print fault.{" "}
          <Todo>TODO(founder): confirm this rule</Todo>
        </p>
      </InfoSection>

      <InfoSection id="content" title="What you may print">
        <p>You are responsible for what you upload. Please only use:</p>
        <ul>
          <li>Photos you took yourself or have permission to use.</li>
          <li>Text and images that you have the right to print.</li>
        </ul>
        <p>We don&rsquo;t print:</p>
        <ul>
          <li>
            Brand logos, cartoon or film characters, sports team badges or other
            copyrighted or trademarked material, unless you own it or have
            written permission.
          </li>
          <li>
            Content that is hateful, obscene, violent, illegal in Pakistan, or
            that uses someone&rsquo;s photo without their consent.
          </li>
        </ul>
        <p>
          We may refuse or cancel an order that breaks these rules.{" "}
          <Todo>
            TODO(founder): anything else we refuse to print (religious or
            political content?)
          </Todo>
        </p>
      </InfoSection>

      <InfoSection id="liability" title="Our responsibility">
        <p>
          If something goes wrong with an order, the most we will do is reprint
          the item or refund what you paid for it.{" "}
          <Todo>
            TODO(founder): liability limit to be reviewed by a qualified person
          </Todo>
        </p>
      </InfoSection>

      <InfoSection id="privacy" title="Your data">
        <p>
          How we handle your details and photos is explained in our{" "}
          <Link href="/privacy">Privacy</Link> page.
        </p>
      </InfoSection>

      <p className="text-xs text-zinc-600">
        Last updated: <Todo>TODO(founder): date when this page is final</Todo>
      </p>
    </InfoPage>
  );
}
