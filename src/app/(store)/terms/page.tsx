import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, InfoPage, InfoSection } from "@/features/info/info-page";

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
          website. Giftified.pk is operated by{" "}
          <strong>Giftified (registration pending), Gujrat, Pakistan</strong>.
          {/* TODO(founder): add the registration number (NTN/SECP) once issued. */}
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
            shown at checkout are the ones you pay. If a price was clearly
            wrong, we&rsquo;ll tell you when we call to confirm, and you can
            accept the correct price or cancel.
          </li>
          <li>
            Products are made to order from your design. Please check spelling,
            names and dates before you order: we print what you design.
          </li>
          <li>
            Colours on your screen may look slightly different from the printed
            product, and printing on a curved mug or on fabric can vary a little
            in position &ndash; up to about 3&nbsp;mm on mugs and 1&nbsp;cm on
            clothing.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cod" title="Cash on Delivery">
        <ul>
          <li>You pay the full amount in cash to the courier on delivery.</li>
          <li>
            Please only confirm an order you intend to receive. Each item is
            made just for you and can&rsquo;t be resold. If you refuse a
            confirmed order at the door, future orders may need advance payment
            (for example by JazzCash or Easypaisa) of the delivery charge or the
            full amount.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="cancellations" title="Changes and cancellations">
        <p>
          You can change or cancel an order until you confirm it with us. After
          that it goes to printing and can&rsquo;t be cancelled, because it is
          made just for you.
        </p>
      </InfoSection>

      <InfoSection id="reprints" title="Damaged or misprinted items">
        <p>
          If your item arrives damaged, or the print doesn&rsquo;t match your
          design, <Link href="/contact">contact us</Link> with photos within{" "}
          <strong>3 days</strong> of delivery. If it was damaged in transit or
          we printed it wrongly, we&rsquo;ll reprint it free of charge &ndash;
          or refund you if a reprint isn&rsquo;t possible. You don&rsquo;t need
          to send the item back.
        </p>
        <p>
          Blurry prints caused by a low-resolution photo that the editor warned
          about are not a print fault.
        </p>
      </InfoSection>

      <InfoSection id="content" title="What you may print">
        <p>
          You are responsible for what you upload: only use photos, text and
          images you have the right to print. We refuse or cancel orders with
          illegal, hateful, obscene, religiously offensive or infringing
          content, as set out in our{" "}
          <Link href="/printing-guidelines">Printing guidelines</Link>. By
          placing an order you confirm your design follows them.
        </p>
      </InfoSection>

      <InfoSection id="liability" title="Our responsibility">
        <p>
          If something goes wrong with an order, the most we will do is reprint
          the item or refund what you paid for it.
          {/* TODO(founder): liability limit to be reviewed by a qualified person. */}
        </p>
      </InfoSection>

      <InfoSection id="privacy" title="Your data">
        <p>
          How we handle your details and photos is explained in our{" "}
          <Link href="/privacy">Privacy</Link> page.
        </p>
      </InfoSection>

      <p className="text-xs text-zinc-600">Last updated: September 2026</p>
    </InfoPage>
  );
}
