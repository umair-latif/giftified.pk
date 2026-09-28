import type { Metadata } from "next";
import Link from "next/link";
import { mug } from "@/config/products/mug";
import { Faq, type FaqItem } from "@/features/info/faq";
import { InfoPage, InfoSection, Todo } from "@/features/info/info-page";
import { DEFAULT_DPI_THRESHOLDS } from "@/lib/dpi";
import { mmToPx, PRINT_DPI } from "@/lib/units";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Delivery, Cash on Delivery, photo quality, order tracking, reprints and cancellations at Giftified.pk.",
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
            We call or message you on the mobile number you gave to confirm your
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
          we can&rsquo;t print your order.{" "}
          <Todo>
            TODO(founder): how many times / over how many days do we try before
            cancelling an unconfirmed order?
          </Todo>
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
          <li>
            Printing:{" "}
            <Todo>TODO(founder): working days to print after confirmation</Todo>
          </li>
          <li>
            Delivery:{" "}
            <Todo>
              TODO(founder): days for major cities vs. other cities; which
              courier(s)
            </Todo>
          </li>
          <li>
            Delivery charge: shown at checkout for your city before you place
            the order.{" "}
            <Todo>
              TODO(founder): flat charge amounts in PKR, and any free-delivery
              threshold
            </Todo>
          </li>
        </ul>
        <p>
          We deliver across Pakistan.{" "}
          <Todo>TODO(founder): any areas we don&rsquo;t deliver to?</Todo>
        </p>
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
          <Todo>
            TODO(founder): do customers get a courier tracking number? If so,
            where do we send it (SMS, WhatsApp)?
          </Todo>
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
          Yes, until you confirm it on our call or message: just tell us then,
          or <Link href="/contact">contact us</Link> as soon as possible.
        </p>
        <p>
          Once you have confirmed and printing has started, your product is made
          just for you, so it usually can&rsquo;t be cancelled.{" "}
          <Todo>
            TODO(founder): cancellation policy after confirmation, and what
            happens if a customer refuses the parcel at the door
          </Todo>
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
          <Link href="/contact">contact us</Link> with photos of the problem.
        </p>
        <p>
          <Todo>
            TODO(founder): reprint/refund policy &ndash; which problems qualify
            (broken mug, wrong size, print fault), how many days to report, do
            we need the item back, reprint vs. refund
          </Todo>
        </p>
        <p>
          Because every item is made to order, we can&rsquo;t take back items
          for a change of mind or for problems caused by a low-quality photo you
          chose to order anyway. <Todo>TODO(founder): confirm this rule</Todo>
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
