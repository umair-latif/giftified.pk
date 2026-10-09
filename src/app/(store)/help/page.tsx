import type { Metadata } from "next";
import Link from "next/link";
import { mug } from "@/config/products/mug";
import { Faq, type FaqItem } from "@/features/info/faq";
import { InfoPage, InfoSection } from "@/features/info/info-page";
import { DEFAULT_DPI_THRESHOLDS } from "@/lib/dpi";
import { mmToPx, PRINT_DPI } from "@/lib/units";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Delivery, Cash on Delivery, photo quality, order tracking, reprints and cancellations at DesignBanana.",
};

const { warnBelow, blockBelow } = DEFAULT_DPI_THRESHOLDS;
/** Pixels a photo needs to cover the whole mug wrap at the "good" DPI, from the product config. */
const mugWrapPx =
  Math.ceil(mmToPx(mug.printArea.widthMm, warnBelow) / 100) * 100;

const ORDERING: readonly FaqItem[] = [
  {
    id: "cod",
    question: "How does Cash on Delivery work?",
    answer: (
      <>
        <p>
          You pay in cash when the parcel arrives. There is nothing to pay
          online.
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>You design your product and place the order.</li>
          <li>
            We contact you on the mobile number you gave to confirm your
            address, the product, colour and size.
          </li>
          <li>
            Only after you confirm do we send your design to our printing
            partner. Nothing is printed before that.
          </li>
          <li>The courier delivers the parcel and you pay the rider.</li>
        </ol>
        <p>
          Please keep your phone on after ordering. If we can&rsquo;t reach you,
          we can&rsquo;t print your order: we wait about a week, and if we still
          haven&rsquo;t been able to confirm it, the order is cancelled. If you
          ordered without signing in, your design may not be kept after that, so
          you would need to start again.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    question: "How long does delivery take, and what does it cost?",
    answer: (
      <>
        <p>
          Every order is printed for you, so it takes a little longer than an
          off-the-shelf product. Total time = printing after you confirm +
          courier delivery to your city.
        </p>
        <ul>
          <li>Printing: 1&ndash;3 days after you confirm your order.</li>
          <li>Delivery: 5&ndash;7 days once printing is finished.</li>
          <li>
            Delivery charge: this depends on your city, so it is shown at
            checkout before you place the order &ndash; there is nothing extra
            to pay the rider beyond the total you see there.
          </li>
        </ul>
        <p>We deliver nationwide, all across Pakistan.</p>
      </>
    ),
  },
  {
    id: "track",
    question: "How do I track my order?",
    answer: (
      <>
        <p>
          Go to <Link href="/track">Track your order</Link> and enter your order
          number and the mobile number you ordered with. Your order number is on
          the confirmation screen after checkout.
        </p>
        <p>What the statuses mean:</p>
        <ul>
          <li>
            <strong>Placed</strong> &ndash; we have your order and will call or
            message you to confirm it.
          </li>
          <li>
            <strong>Confirmed</strong> &ndash; you confirmed; your design is
            with our printing partner.
          </li>
          <li>
            <strong>Shipped</strong> &ndash; on its way with the courier.
          </li>
          <li>
            <strong>Delivered</strong> &ndash; delivered and paid.
          </li>
          <li>
            <strong>Cancelled</strong> &ndash; the order was not confirmed or
            was cancelled.
          </li>
        </ul>
        <p>
          When your parcel is handed to the courier, we send you the courier
          tracking number by email or message.
        </p>
      </>
    ),
  },
  {
    id: "cancel",
    question: "Can I change or cancel my order?",
    answer: (
      <>
        <p>
          Yes. You can cancel or change your order any time up to the moment we
          hand your design over to the printing partner &ndash; which happens
          after you confirm the order when we contact you. Just tell us then, or{" "}
          <Link href="/contact">contact us</Link> as soon as possible.
        </p>
        <p>
          After your design has gone to printing it can no longer be cancelled,
          because your product is made just for you and cannot be resold.
        </p>
      </>
    ),
  },
];

const QUALITY: readonly FaqItem[] = [
  {
    id: "photo-quality",
    question: "What does “too blurry” mean for my photo?",
    answer: (
      <>
        <p>
          We print at {PRINT_DPI} DPI, so a photo has to have enough pixels for
          the size you stretch it to. The editor checks this every time you
          resize a photo:
        </p>
        <ul>
          <li>
            <strong>{warnBelow} DPI or more</strong> &ndash; sharp. Go ahead.
          </li>
          <li>
            <strong>
              {blockBelow}&ndash;{warnBelow} DPI
            </strong>{" "}
            &ndash; we warn you: it may look slightly soft. Making the photo
            smaller on the product fixes it.
          </li>
          <li>
            <strong>Below {blockBelow} DPI</strong> &ndash; it would print
            blurry, so you can&rsquo;t order it at that size. Make it smaller or
            use a bigger photo.
          </li>
        </ul>
        <p>
          Example: a photo across the whole {mug.printArea.widthMm} mm mug wrap
          needs to be about {mugWrapPx.toLocaleString("en-US")} pixels wide. A
          normal photo from a modern phone camera is much bigger than that.
        </p>
      </>
    ),
  },
  {
    id: "photo-tips",
    question: "Tips for a photo that prints well",
    answer: (
      <ul>
        <li>Upload the original photo from your gallery, not a screenshot.</li>
        <li>
          Photos forwarded on WhatsApp or downloaded from Facebook/Instagram are
          compressed and often too small. Ask the person for the original, or
          send it as a &ldquo;document&rdquo; on WhatsApp.
        </li>
        <li>Use a bright, in-focus photo. Printing can&rsquo;t fix blur.</li>
        <li>
          Keep faces and text inside the dashed line in the editor, away from
          the edges and (on mugs) the handle.
        </li>
        <li>
          Colours on screen are brighter than ink on a mug or fabric; very dark
          photos print darker.
        </li>
      </ul>
    ),
  },
  {
    id: "reprint",
    question: "What if my product arrives damaged or misprinted?",
    answer: (
      <>
        <p>
          Please check the parcel when it arrives and{" "}
          <Link href="/contact">contact us</Link> within{" "}
          <strong>48 hours</strong> with your order number, a description of the
          problem and clear photos of the item.
        </p>
        <ul>
          <li>
            <strong>Printing fault</strong> (smudged, misaligned, wrong colours,
            wrong size printed) &ndash; we reprint your item free of charge.
          </li>
          <li>
            <strong>Damaged product</strong> (a mug that arrived broken or
            chipped, a torn garment) &ndash; we reprint it, or refund you if you
            prefer.
          </li>
        </ul>
        <p>
          Refunds are only for a fault on our side: a printing fault or a
          damaged product, reported with photos within 48 hours.
        </p>
        <p>
          Because every item is made to order, we can&rsquo;t take back items
          for a change of mind, for a mistake in the design you sent us (a typo,
          the wrong photo, the wrong spelling of a name), or for a photo that
          printed soft after the editor warned you it was low quality and you
          chose to order it anyway. Please check your design carefully on the
          preview screen before you order.
        </p>
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <InfoPage
      title="Help & FAQ"
      intro={
        <>
          Quick answers about ordering, delivery and printing. Still stuck?{" "}
          <Link href="/contact" className="text-brand-700 underline">
            Contact us
          </Link>
          .
        </>
      }
    >
      <InfoSection title="Ordering and delivery">
        <Faq items={ORDERING} />
      </InfoSection>
      <InfoSection title="Photos and print quality">
        <Faq items={QUALITY} />
      </InfoSection>
    </InfoPage>
  );
}
